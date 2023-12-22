// https://wiki.nesdev.org/w/index.php/NTSC_video
let ntsc = false
let signal_levels = new Array(256*8).fill(0)
let ppu_cycles = 0
let phase_scanline_start = 0

const black = 0.518;
const white = 1.962;
const attenuation = 0.746;
const levels = [0.350, 0.518, 0.962, 1.550, // low
								1.094, 1.506, 1.962, 1.962]; // high

function approxsin(t) {
	let j = t * 0.15915;
	j = j - Math.floor(j);
	return 20.785 * j * (j - 0.5) * (j - 1);
}

function approxcos(t) {
	return approxsin(Math.PI / 2 - t);
}

let current_color = new Color();
let scanlinefilter = false;

function NTSCsignal(pixel, phase) {
	let color = (pixel & 0x0F);
	let level = (pixel >> 4) & 3;
	let emphasis = (pixel >> 6);
	if (color > 13) level = 1;
	
	let low = levels[0 + level];
	let high = levels[4 + level];
	if (color == 0) low = high;
  if (color > 12) high = low;
	
	let signal = ((color + phase) % 12 < 6) ? high : low;
	
	if ( ((emphasis & 1) && ((0 + phase) % 12 < 6))
	||   ((emphasis & 2) && ((4 + phase) % 12 < 6))
	||   ((emphasis & 4) && ((8 + phase) % 12 < 6)) ) signal = signal * attenuation;
	
	return signal;
}

function RenderNTSCpixel(x, pixel, PPU_cycle_counter) {
	let phase = PPU_cycle_counter * 8;
	
	for (let p = 0; p < 8; p++) {
		let signal = NTSCsignal(pixel, phase + p);
		signal = (signal-black) / (white-black);
		
		signal_levels[x*8 + p] = signal;
	}
}

let gamma = 2.0;
let brightness = 1;
let saturation = 1;
let hue = 0;
let bluramount = 6;
let screenscale = 1;

function gammafix(f) { 
	return f <= 0 ? 0 : Math.pow(f, 2.2 / gamma) 
}

function clamp(v) {
	return v > 255 ? 255 : v;
}

function YIQtoRGB(y, i, q) {
	/*let c = (
      0x10000*clamp(255.95 * gammafix(y +  0.946882*i +  0.623557*q))
    + 0x00100*clamp(255.95 * gammafix(y + -0.274788*i + -0.635691*q))
    + 0x00001*clamp(255.95 * gammafix(y + -1.108545*i +  1.709007*q)));*/
	
	current_color.r = clamp(255.95 * gammafix(y +  0.946882*i +  0.623557*q))
	current_color.g = clamp(255.95 * gammafix(y + -0.274788*i + -0.635691*q))
	current_color.b = clamp(255.95 * gammafix(y + -1.108545*i +  1.709007*q))
}

class nes2C02 {
	cart = null;
	mode = 0;
	
	tblName = [new Uint8Array(1024), new Uint8Array(1024)];
	tblPalette = new Uint8Array(32);
	tblPattern = [new Uint8Array(4096), new Uint8Array(4096)];
	
	palScreen = new Array(0x40).fill().map(u => { return new Color(); });
	sprScreen = new Sprite(256*2, 240*2);
	sprNameTable = [new Sprite(256, 240), new Sprite(256, 240)];
	sprPatternTable = [new Sprite(128, 128), new Sprite(128, 128)];
	
	GetScreen() {
		return this.sprScreen;
	}
	
	GetNameTable(i) {
		return this.sprNameTable[i];
	}
	
	GetColorFromPaletteRam(palette, pixel) {
		return this.palScreen[this.ppuRead(0x3F00 + ((palette << 2) & 0xFF) + pixel) & 0x3F];
	}
	
	GetPatternTable(i, palette) {
		for (let tileY = 0; tileY < 16; tileY++) {
			for (let tileX = 0; tileX < 16; tileX++) {
				let offset = tileY * 256 + tileX * 16;
				
				for (let row = 0; row < 8; row++) {
					let tile_lsb = this.ppuRead(i * 0x1000 + offset + row + 0);
					let tile_msb = this.ppuRead(i * 0x1000 + offset + row + 8);
					
					for (let col = 0; col < 8; col++) {
						let pixel = (tile_lsb & 0x01) << 1 | (tile_msb & 0x01);
						tile_lsb >>= 1; tile_msb >>= 1;
						
						this.sprPatternTable[i].SetPixel(
							tileX * 8 + (7 - col),
							tileY * 8 + row,
							this.GetColorFromPaletteRam(palette, pixel)
						);
					}
				}
			}
		}
		
		return this.sprPatternTable[i];
	}
	
	frame_complete = false;
	nmi = false;
	
	scanline = 0;
	cycle = 0;
	
	status = new PPUSTATUS();
	mask = new PPUMASK();
	control = new PPUCTRL();
	
	address_latch = 0x00;
	ppu_data_buffer = 0x00;
	
	vram_addr = new loopy_register();
	tram_addr = new loopy_register();
	
	fine_x = 0x00;
	
	bg_next_tile_id = 0x00;
	bg_next_tile_attrib = 0x00;
	bg_next_tile_lsb = 0x00;
	bg_next_tile_msb = 0x00;
	
	bg_shifter_pattern_lo = 0x0000;
	bg_shifter_pattern_hi = 0x0000;
	bg_shifter_attrib_lo = 0x0000;
	bg_shifter_attrib_hi = 0x0000;
	
	OAM = new Array(64).fill().map(u => { return new ObjectAttributeEntry(); });
	pOAM(addr, data) {
		let which = this.OAM[Math.floor(addr / 4)];
		if (data !== undefined) {
			switch(addr % 4) {
			case 0:
				which.y = data;
				break;
			case 1:
				which.id = data;
				break;
			case 2:
				which.attribute = data;
				break;
			case 3:
				which.x = data;
				break;
			}
		} else {
			switch(addr % 4) {
			case 0:
				return which.y;
			case 1:
				return which.id;
			case 2:
				return which.attribute;
			case 3:
				return which.x;
			}
		}
	}
	
	oam_addr = 0x00;
	
	spriteScanline = new Array(8).fill().map(u => { return new ObjectAttributeEntry(); });
	sprite_count = 0x00;
	
	sprite_shifter_pattern_lo = new Uint8Array(8);
	sprite_shifter_pattern_hi = new Uint8Array(8);
	
	spriteZeroHitPossible = false;
	spriteZeroBeingRendered = false;
	
	ConnectCartridge(cartridge) {
		this.cart = cartridge;
	}
	
	constructor() {
		this.palScreen[0x00] = new Color(84, 84, 84);
		this.palScreen[0x01] = new Color(0, 30, 116);
		this.palScreen[0x02] = new Color(8, 16, 144);
		this.palScreen[0x03] = new Color(48, 0, 136);
		this.palScreen[0x04] = new Color(68, 0, 100);
		this.palScreen[0x05] = new Color(92, 0, 48);
		this.palScreen[0x06] = new Color(84, 4, 0);
		this.palScreen[0x07] = new Color(60, 24, 0);
		this.palScreen[0x08] = new Color(32, 42, 0);
		this.palScreen[0x09] = new Color(8, 58, 0);
		this.palScreen[0x0A] = new Color(0, 64, 0);
		this.palScreen[0x0B] = new Color(0, 60, 0);
		this.palScreen[0x0C] = new Color(0, 50, 60);
		this.palScreen[0x0D] = new Color(0, 0, 0);
		this.palScreen[0x0E] = new Color(0, 0, 0);
		this.palScreen[0x0F] = new Color(0, 0, 0);

		this.palScreen[0x10] = new Color(152, 150, 152);
		this.palScreen[0x11] = new Color(8, 76, 196);
		this.palScreen[0x12] = new Color(48, 50, 236);
		this.palScreen[0x13] = new Color(92, 30, 228);
		this.palScreen[0x14] = new Color(136, 20, 176);
		this.palScreen[0x15] = new Color(160, 20, 100);
		this.palScreen[0x16] = new Color(152, 34, 32);
		this.palScreen[0x17] = new Color(120, 60, 0);
		this.palScreen[0x18] = new Color(84, 90, 0);
		this.palScreen[0x19] = new Color(40, 114, 0);
		this.palScreen[0x1A] = new Color(8, 124, 0);
		this.palScreen[0x1B] = new Color(0, 118, 40);
		this.palScreen[0x1C] = new Color(0, 102, 120);
		this.palScreen[0x1D] = new Color(0, 0, 0);
		this.palScreen[0x1E] = new Color(0, 0, 0);
		this.palScreen[0x1F] = new Color(0, 0, 0);

		this.palScreen[0x20] = new Color(236, 238, 236);
		this.palScreen[0x21] = new Color(76, 154, 236);
		this.palScreen[0x22] = new Color(120, 124, 236);
		this.palScreen[0x23] = new Color(176, 98, 236);
		this.palScreen[0x24] = new Color(228, 84, 236);
		this.palScreen[0x25] = new Color(236, 88, 180);
		this.palScreen[0x26] = new Color(236, 106, 100);
		this.palScreen[0x27] = new Color(212, 136, 32);
		this.palScreen[0x28] = new Color(160, 170, 0);
		this.palScreen[0x29] = new Color(116, 196, 0);
		this.palScreen[0x2A] = new Color(76, 208, 32);
		this.palScreen[0x2B] = new Color(56, 204, 108);
		this.palScreen[0x2C] = new Color(56, 180, 204);
		this.palScreen[0x2D] = new Color(60, 60, 60);
		this.palScreen[0x2E] = new Color(0, 0, 0);
		this.palScreen[0x2F] = new Color(0, 0, 0);

		this.palScreen[0x30] = new Color(236, 238, 236);
		this.palScreen[0x31] = new Color(168, 204, 236);
		this.palScreen[0x32] = new Color(188, 188, 236);
		this.palScreen[0x33] = new Color(212, 178, 236);
		this.palScreen[0x34] = new Color(236, 174, 236);
		this.palScreen[0x35] = new Color(236, 174, 212);
		this.palScreen[0x36] = new Color(236, 180, 176);
		this.palScreen[0x37] = new Color(228, 196, 144);
		this.palScreen[0x38] = new Color(204, 210, 120);
		this.palScreen[0x39] = new Color(180, 222, 120);
		this.palScreen[0x3A] = new Color(168, 226, 144);
		this.palScreen[0x3B] = new Color(152, 226, 180);
		this.palScreen[0x3C] = new Color(160, 214, 228);
		this.palScreen[0x3D] = new Color(160, 162, 160);
		this.palScreen[0x3E] = new Color(0, 0, 0);
		this.palScreen[0x3F] = new Color(0, 0, 0);
	}
	
	reset() {
		this.fine_x = 0x00;
		this.address_latch = 0x00;
		this.ppu_data_buffer = 0x00;
		this.scanline = 0;
		this.cycle = 0;
		this.bg_next_tile_id = 0x00;
		this.bg_next_tile_attrib = 0x00;
		this.bg_next_tile_lsb = 0x00;
		this.bg_next_tile_msb = 0x00;
		this.bg_shifter_pattern_lo = 0x0000;
		this.bg_shifter_pattern_hi = 0x0000;
		this.bg_shifter_attrib_lo = 0x0000;
		this.bg_shifter_attrib_hi = 0x0000;
		this.status.reg = 0x00;
		this.mask.reg = 0x00;
		this.control.reg = 0x00;
		this.vram_addr.reg = 0x0000;
		this.tram_addr.reg = 0x0000;
	}
	
	IncrementScrollX() {
		if (this.mask.render_background || this.mask.render_sprites) {
			if (this.vram_addr.coarse_x === 31) {
				this.vram_addr.coarse_x = 0;
				this.vram_addr.nametable_x = this.vram_addr.nametable_x ? 0 : 1;
			} else {
				this.vram_addr.coarse_x++;
			}
		}
	}
	
	IncrementScrollY() {
		if (this.mask.render_background || this.mask.render_sprites) {
			if (this.vram_addr.fine_y < 7) {
				this.vram_addr.fine_y++;
			} else {
				this.vram_addr.fine_y = 0;
				
				if (this.vram_addr.coarse_y === 29) {
					this.vram_addr.coarse_y = 0;
					
					this.vram_addr.nametable_y = this.vram_addr.nametable_y ? 0 : 1;
				} else if (this.vram_addr.coarse_y === 31) {
					this.vram_addr.coarse_y = 0;
				} else {
					this.vram_addr.coarse_y++;
				}
			}
		}
	}
	
	TransferAddressX() {
		if (this.mask.render_background || this.mask.render_sprites) {
			this.vram_addr.nametable_x = this.tram_addr.nametable_x;
			this.vram_addr.coarse_x = this.tram_addr.coarse_x;
		}
	}
	
	TransferAddressY() {
		if (this.mask.render_background || this.mask.render_sprites) {
			this.vram_addr.fine_y = this.tram_addr.fine_y;
			this.vram_addr.nametable_y = this.tram_addr.nametable_y;
			this.vram_addr.coarse_y = this.tram_addr.coarse_y;
		}
	}
	
	LoadBackgroundShifters() {
		this.bg_shifter_pattern_lo = (this.bg_shifter_pattern_lo & 0xFF00) | this.bg_next_tile_lsb;
		this.bg_shifter_pattern_hi = (this.bg_shifter_pattern_hi & 0xFF00) | this.bg_next_tile_msb;
		this.bg_shifter_attrib_lo = (this.bg_shifter_attrib_lo & 0xFF00) | ((this.bg_next_tile_attrib & 0b01) ? 0xFF : 0x00);
		this.bg_shifter_attrib_hi = (this.bg_shifter_attrib_hi & 0xFF00) | ((this.bg_next_tile_attrib & 0b10) ? 0xFF : 0x00);
	}
	
	UpdateShifters() {
		if (this.mask.render_background) {
			this.bg_shifter_pattern_lo <<= 1;
			this.bg_shifter_pattern_hi <<= 1;
			this.bg_shifter_attrib_lo <<= 1;
			this.bg_shifter_attrib_hi <<= 1;
		}
		
		if (this.mask.render_sprites && this.cycle >= 1 && this.cycle < 258) {
			for (let i = 0; i < this.sprite_count; i++) {
				if (this.spriteScanline[i].x > 0) {
					this.spriteScanline[i].x--;
				} else {
					this.sprite_shifter_pattern_lo[i] <<= 1;
					this.sprite_shifter_pattern_hi[i] <<= 1;
				}
			}
		}
	}
	
	clock() {
		if (this.scanline >= -1 && this.scanline < 240) {
			if (this.scanline === 0 && this.cycle === 0) {
				this.cycle = 1;
			}
			
			if (this.scanline === -1 && this.cycle === 1) {
				this.status.vertical_blank = 0;
				this.status.sprite_zero_hit = 0;
				this.status.sprite_overflow = 0;
				
				for (let i = 0; i < 8; i++) {
					this.sprite_shifter_pattern_lo[i] = 0;
					this.sprite_shifter_pattern_hi[i] = 0;
				}
			}
			
			if ((this.cycle >= 2 && this.cycle < 258) || (this.cycle >= 321 && this.cycle < 338)) {
				this.UpdateShifters()
				
				switch ((this.cycle - 1) % 8) {
				case 0:
					this.LoadBackgroundShifters();
					this.bg_next_tile_id = this.ppuRead(0x2000 | (this.vram_addr.reg & 0x0FFF));
					break;
				case 2:
					this.bg_next_tile_attrib = this.ppuRead(0x23C0 | (this.vram_addr.nametable_y << 11)
						| (this.vram_addr.nametable_x << 10)
						| ((this.vram_addr.coarse_y >> 2) << 3)
						| (this.vram_addr.coarse_x >> 2));
					if (this.vram_addr.coarse_y & 0x02) this.bg_next_tile_attrib >>= 4;
					if (this.vram_addr.coarse_x & 0x02) this.bg_next_tile_attrib >>= 2;
					this.bg_next_tile_attrib &= 0x03;
					break;
				case 4:
					this.bg_next_tile_lsb = this.ppuRead((this.control.pattern_background << 12)
						+ (this.bg_next_tile_id << 4)
						+ (this.vram_addr.fine_y) + 0);
					break;
				case 6:
					this.bg_next_tile_msb = this.ppuRead((this.control.pattern_background << 12)
						+ (this.bg_next_tile_id << 4)
						+ (this.vram_addr.fine_y) + 8);
					break;
				case 7:
					this.IncrementScrollX();
				}
			}
			
			if (this.cycle === 256) {
				this.IncrementScrollY();
			}
			
			if (this.cycle === 257) {
				this.LoadBackgroundShifters();
				this.TransferAddressX();
			}
			
			if (this.cycle === 338 || this.cycle === 340) {
				this.bg_next_tile_id = this.ppuRead(0x2000 | (this.vram_addr.reg & 0x0FFF));
			}
			
			if (this.scanline === -1 && this.cycle >= 280 && this.cycle < 305) {
				this.TransferAddressY();
			}
			
			//Foreground Rendering
			if (this.cycle === 257 && this.scanline >= 0) {
				//this.spriteScanline.forEach(function(e){e.reset(0xFF)});
				this.sprite_count = 0;
				
				for (let i = 0; i < 8; i++) {
					this.sprite_shifter_pattern_lo[i] = 0;
					this.sprite_shifter_pattern_hi[i] = 0;
				}
				
				let OAMEntry = 0;
				this.spriteZeroHitPossible = false;
				while (OAMEntry < 64 && this.sprite_count < 9) {
					let diff = (this.scanline - this.OAM[OAMEntry].y);
					if (diff >= 0 && diff < (this.control.sprite_size ? 16 : 8)) {
						if (this.sprite_count < 8) {
							if (OAMEntry === 0) {
								this.spriteZeroHitPossible = true;
							}
							
							this.spriteScanline[this.sprite_count].cpy(this.OAM[OAMEntry]);
							this.sprite_count++;
						}
					}
					OAMEntry++;
				}
				this.status.sprite_overflow = (this.sprite_count > 8);
			}
			
			if (this.cycle === 340) {
				for (let i = 0; i < this.sprite_count; i++) {
					let sprite_pattern_bits_lo, sprite_pattern_bits_hi;
					let sprite_pattern_addr_lo, sprite_pattern_addr_hi;
					
					if (!this.control.sprite_size) {
						if (!(this.spriteScanline[i].attribute & 0x80)) {
							sprite_pattern_addr_lo = 
								(this.control.pattern_sprite << 12)
								| (this.spriteScanline[i].id << 4)
								| (this.scanline - this.spriteScanline[i].y);
						} else {
							sprite_pattern_addr_lo = 
								(this.control.pattern_sprite << 12)
								| (this.spriteScanline[i].id << 4)
								| (7 - (this.scanline - this.spriteScanline[i].y));
						}
					} else {
						if (!(this.spriteScanline[i].attribute & 0x80)) {
							if (this.scanline - this.spriteScanline[i].y < 8) {
								sprite_pattern_addr_lo = 
									((this.spriteScanline[i].id & 0x01) << 12)
									| ((this.spriteScanline[i].id & 0xFE) << 4)
									| ((this.scanline - this.spriteScanline[i].y) & 0x07);
							} else {
								sprite_pattern_addr_lo = 
									((this.spriteScanline[i].id & 0x01) << 12)
									| (((this.spriteScanline[i].id & 0xFE) + 1) << 4)
									| ((this.scanline - this.spriteScanline[i].y) & 0x07);
							}
						} else {
							if (this.scanline - this.spriteScanline[i].y < 8) {
								sprite_pattern_addr_lo = 
									((this.spriteScanline[i].id & 0x01) << 12)
									| (((this.spriteScanline[i].id & 0xFE) + 1) << 4)
									| (7 - (this.scanline - this.spriteScanline[i].y) & 0x07);
							} else {
								sprite_pattern_addr_lo = 
									((this.spriteScanline[i].id & 0x01) << 12)
									| ((this.spriteScanline[i].id & 0xFE) << 4)
									| (7 - (this.scanline - this.spriteScanline[i].y) & 0x07);
							}
						}
					}
					
					sprite_pattern_addr_hi = sprite_pattern_addr_lo + 8;
					sprite_pattern_bits_lo = this.ppuRead(sprite_pattern_addr_lo);
					sprite_pattern_bits_hi = this.ppuRead(sprite_pattern_addr_hi);
					
					if (this.spriteScanline[i].attribute & 0x40) {
						sprite_pattern_bits_lo = flipbyte(sprite_pattern_bits_lo);
						sprite_pattern_bits_hi = flipbyte(sprite_pattern_bits_hi);
					}
					
					this.sprite_shifter_pattern_lo[i] = sprite_pattern_bits_lo;
					this.sprite_shifter_pattern_hi[i] = sprite_pattern_bits_hi;
				}
			}
		}
		
		if (this.scanline === 240) {
			
		}
		
		if (this.scanline === 241 && this.cycle === 1) {
			this.status.vertical_blank = 1;
			if (this.control.enable_nmi) {
				this.nmi = true;
			}
		}
		
		let bg_pixel = 0x00;
		let bg_palette = 0x00;
		
		if (this.mask.render_background) {
			if ((this.mask.render_background_left && this.cycle < 9) || this.cycle >= 9) {
				let bit_mux = 0x8000 >> this.fine_x;
				
				let p0_pixel = (this.bg_shifter_pattern_lo & bit_mux) > 0 ? 1 : 0;
				let p1_pixel = (this.bg_shifter_pattern_hi & bit_mux) > 0 ? 1 : 0;
				bg_pixel = (p1_pixel << 1) | p0_pixel;
				
				let bg_pal0 = (this.bg_shifter_attrib_lo & bit_mux) > 0 ? 1 : 0;
				let bg_pal1 = (this.bg_shifter_attrib_hi & bit_mux) > 0 ? 1 : 0;
				bg_palette = (bg_pal1 << 1) | bg_pal0;
			}
		}
		
		let fg_pixel = 0x00;
		let fg_palette = 0x00;
		let fg_priority = 0x00;
		
		if (this.mask.render_sprites) {
			if ((this.mask.render_sprites_left && this.cycle < 9) || this.cycle >= 9) {
				this.spriteZeroBeingRendered = false;
				
				for (let i = 0; i < this.sprite_count; i++) {
					if (this.spriteScanline[i].x === 0) {
						let fg_pixel_lo = (this.sprite_shifter_pattern_lo[i] & 0x80) > 0;
						let fg_pixel_hi = (this.sprite_shifter_pattern_hi[i] & 0x80) > 0;
						fg_pixel = (fg_pixel_hi << 1) | fg_pixel_lo;
						
						fg_palette = (this.spriteScanline[i].attribute & 0x03) + 0x04;
						fg_priority = (this.spriteScanline[i].attribute & 0x20) === 0;
						
						if (fg_pixel !== 0) {
							if (i === 0) {
								this.spriteZeroBeingRendered = true;
							}
							
							break;
						}
					}
				}
			}
		}
		
		let pixel = 0x00;
		let palette = 0x00;
		
		if (bg_pixel === 0 && fg_pixel === 0) {
			pixel = 0x00;
			palette = 0x00;
		} else if (bg_pixel === 0 && fg_pixel > 0) {
			pixel = fg_pixel;
			palette = fg_palette;
		} else if (bg_pixel > 0 && fg_pixel === 0) {
			pixel = bg_pixel;
			palette = bg_palette;
		} else if (bg_pixel > 0 && fg_pixel > 0) {
			if (fg_priority) {
				pixel = fg_pixel;
				palette = fg_palette;
			} else {
				pixel = bg_pixel;
				palette = bg_palette;
			}
			
			if (this.spriteZeroHitPossible && this.spriteZeroBeingRendered) {
				if (this.mask.render_background & this.mask.render_sprites) {
					if (!(this.mask.render_background_left || this.mask.render_sprites_left)) {
						if (this.cycle >= 9 && this.cycle < 258) {
							this.status.sprite_zero_hit = 1;
						}
					} else {
						if (this.cycle >= 1 && this.cycle < 258) {
							this.status.sprite_zero_hit = 1;
						}
					}
				}
			}
		}
		
		if (!ntsc) {
			this.sprScreen.SetPixel((this.cycle - 1) * screenscale, this.scanline * screenscale, this.GetColorFromPaletteRam(palette, pixel));//this.palScreen[(Math.floor(Math.random() * 32768) % 2) ? 0x3F : 0x30]);
			if (screenscale > 1) {
				this.sprScreen.SetPixel((this.cycle - 1) * screenscale, this.scanline * screenscale + 1, this.GetColorFromPaletteRam(palette, pixel));
				this.sprScreen.SetPixel((this.cycle - 1) * screenscale + 1, this.scanline * screenscale, this.GetColorFromPaletteRam(palette, pixel));
				this.sprScreen.SetPixel((this.cycle - 1)* screenscale + 1, this.scanline * screenscale + 1, this.GetColorFromPaletteRam(palette, pixel));
			}
		} else {
			RenderNTSCpixel(this.cycle, this.ppuRead(0x3F00 + ((palette << 2) & 0xFF) + pixel) & 0x3F, ppu_cycles);
		}
		
		this.cycle++;
		ppu_cycles++;
		if (this.mask.render_background || this.mask.render_sprites) {
			if (this.cycle === 260 && this.scanline < 240) {
				this.cart.GetMapper().scanline();
			}
		}
		
		if (this.cycle >= 341) {	
			let Width = 256*screenscale
			let phase = phase_scanline_start % 12 + hue;
			if (ntsc && this.scanline < 240) {
				for (let x = 1; x <= Width; x++) {
					let center = x * (256*8) / Width + 0;
					let begin = center - 6; if (begin < 0)     begin = 0;
					let end   = center + 6; if (end   > 256*8) end   = 256*8;
					let y = 0;
					let i = 0;
					let q = 0;
					for (let p = begin; p < end; p++) {
						let level = signal_levels[p] / 12;
						y = y + level;
						i = i + level * approxcos( Math.PI *(phase+p) / 6);
						q = q + level * approxsin( Math.PI *(phase+p) / 6);
					}
					
					YIQtoRGB(y * brightness, i * saturation * brightness, q * saturation * brightness)
					this.sprScreen.SetPixel(x - 1 * screenscale, this.scanline * screenscale, current_color)
					if (screenscale == 2) this.sprScreen.SetPixel(x - 1 * screenscale, this.scanline * screenscale + 1, current_color, scanlinefilter ? 0.88 : 1)
				}
			}
			
			this.cycle = 0;
			this.scanline++;
			phase_scanline_start = ppu_cycles * 8 + 3.9;
			if (this.scanline >= 261 + (this.mode * 49)) {
				this.scanline = -1;
				this.frame_complete = true;
				//vsync, disable for now
				//this.sprScreen.UpdatePixels();
			}
		}
	}
	
	obdata = 0x00;
	
	cpuRead(addr, rdonly = false) {
		let data = this.obdata;
		
		if (rdonly) {
			switch (addr) {
			case 0x0000: // Control
				data = this.control.reg;
				break;
			case 0x0001: // Mask
				data = this.mask.reg;
				break;
			case 0x0002: // Status
				data = this.status.reg;
				break;
			case 0x0003: // OAM Address
				break;
			case 0x0004: // OAM Data
				break;
			case 0x0005: // Scroll
				break;
			case 0x0006: // PPU Address
				break;
			case 0x0007: // PPU Data
				break;
			}
		} else {
			switch (addr) {
			case 0x0000: // Control
				break;
			case 0x0001: // Mask
				break;
			case 0x0002: // Status
				data = (this.status.reg & 0xE0) | (this.ppu_data_buffer & 0x1F);
				this.status.vertical_blank = 0;
				this.address_latch = 0;
				break;
			case 0x0003: // OAM Address
				break;
			case 0x0004: // OAM Data
				data = this.pOAM(this.oam_addr);
				break;
			case 0x0005: // Scroll
				break;
			case 0x0006: // PPU Address
				break;
			case 0x0007: // PPU Data
				data = this.ppu_data_buffer;
				this.ppu_data_buffer = this.ppuRead(this.vram_addr.reg);
				
				if (this.vram_addr.reg > 0x3f00) data = this.ppu_data_buffer;
				this.vram_addr.reg++;
				break;
			}
		}
		
		return data;
	}
	
	cpuWrite(addr, data) {
		this.obdata = data;
		switch (addr) {
		case 0x0000: // Control
			this.control.reg = data;
			this.tram_addr.nametable_x = this.control.nametable_x
			this.tram_addr.nametable_y = this.control.nametable_y
			break;
		case 0x0001: // Mask
			this.mask.reg = data;
			break;
		case 0x0002: // Status
			break;
		case 0x0003: // OAM Address
			this.oam_addr = data;
			break;
		case 0x0004: // OAM Data
			this.pOAM(this.oam_addr, data);
			break;
		case 0x0005: // Scroll
			if (this.address_latch === 0) {
				this.fine_x = data & 0x07;
				this.tram_addr.coarse_x = data >> 3;
				this.address_latch = 1;
			} else {
				this.tram_addr.fine_y = data & 0x07;
				this.tram_addr.coarse_y = data >> 3;
				this.address_latch = 0;
			}
			break;
		case 0x0006: // PPU Address
			if (this.address_latch === 0) {
				this.tram_addr.reg = (this.tram_addr.reg & 0x00FF) | (data << 8);
				this.address_latch = 1;
			} else {
				this.tram_addr.reg = (this.tram_addr.reg & 0xFF00) | data;
				this.vram_addr.reg = this.tram_addr.reg
				this.address_latch = 0;
			}
			break;
		case 0x0007: // PPU Data
			this.ppuWrite(this.vram_addr.reg, data);
			this.vram_addr.reg += (this.control.increment_mode ? 32 : 1);
			break;
		}
	}
	
	data = new uint8();
	
	ppuRead(addr, rdonly = false) {
		this.data.v = 0;
		addr &= 0x3FFF;
		
		if (this.cart.ppuRead(addr, this.data)) {
			
		} else if (addr >= 0x0000 && addr <= 0x1FFF) {
			this.data.v = this.tblPattern[(addr & 0x1000) >> 12][addr & 0x0FFF];
		} else if (addr >= 0x2000 && addr <= 0x3EFF) {
			addr &= 0x0FFF;
			if (this.cart.Mirror() === MIRROR.VERTICAL) {
				if (addr >= 0x0000 && addr <= 0x03FF) {
					this.data.v = this.tblName[0][addr & 0x03FF];
				}
				if (addr >= 0x0400 && addr <= 0x07FF) {
					this.data.v = this.tblName[1][addr & 0x03FF];
				}
				if (addr >= 0x0800 && addr <= 0x0BFF) {
					this.data.v = this.tblName[0][addr & 0x03FF];
				}
				if (addr >= 0x0C00 && addr <= 0x0FFF) {
					this.data.v = this.tblName[1][addr & 0x03FF];
				}
			} else if (this.cart.Mirror() === MIRROR.HORIZONTAL) {
				if (addr >= 0x0000 && addr <= 0x03FF) {
					this.data.v = this.tblName[0][addr & 0x03FF];
				}
				if (addr >= 0x0400 && addr <= 0x07FF) {
					this.data.v = this.tblName[0][addr & 0x03FF];
				}
				if (addr >= 0x0800 && addr <= 0x0BFF) {
					this.data.v = this.tblName[1][addr & 0x03FF];
				}
				if (addr >= 0x0C00 && addr <= 0x0FFF) {
					this.data.v = this.tblName[1][addr & 0x03FF];
				}
			}
		} else if (addr >= 0x3F00 && addr <= 0x3FFF) {
			addr &= 0x001F;
			if (addr === 0x0010) addr = 0x0000;
			if (addr === 0x0014) addr = 0x0004;
			if (addr === 0x0018) addr = 0x0008;
			if (addr === 0x001C) addr = 0x000C;
			this.data.v = this.tblPalette[addr];
		}
		
		return this.data.v;
	}
	
	ppuWrite(addr, data) {
		addr &= 0x3FFF;
		this.data.v = data;
		
		if (this.cart.ppuWrite(addr, this.data)) {
			
		} else if (addr >= 0x0000 && addr <= 0x1FFF) {
			this.tblPattern[(addr & 0x1000) >> 12][addr & 0x0FFF] = this.data.v;
		} else if (addr >= 0x2000 && addr <= 0x3EFF) {
			addr &= 0x0FFF;
			if (this.cart.Mirror() === MIRROR.VERTICAL) {
				if (addr >= 0x0000 && addr <= 0x03FF) {
					this.tblName[0][addr & 0x03FF] = this.data.v;
				}
				if (addr >= 0x0400 && addr <= 0x07FF) {
					this.tblName[1][addr & 0x03FF] = this.data.v;
				}
				if (addr >= 0x0800 && addr <= 0x0BFF) {
					this.tblName[0][addr & 0x03FF] = this.data.v;
				}
				if (addr >= 0x0C00 && addr <= 0x0FFF) {
					this.tblName[1][addr & 0x03FF] = this.data.v;
				}
			} else if (this.cart.Mirror() === MIRROR.HORIZONTAL) {
				if (addr >= 0x0000 && addr <= 0x03FF) {
					this.tblName[0][addr & 0x03FF] = this.data.v;
				}
				if (addr >= 0x0400 && addr <= 0x07FF) {
					this.tblName[0][addr & 0x03FF] = this.data.v;
				}
				if (addr >= 0x0800 && addr <= 0x0BFF) {
					this.tblName[1][addr & 0x03FF] = this.data.v;
				}
				if (addr >= 0x0C00 && addr <= 0x0FFF) {
					this.tblName[1][addr & 0x03FF] = this.data.v;
				}
			}
		} else if (addr >= 0x3F00 && addr <= 0x3FFF) {
			addr &= 0x001F;
			if (addr === 0x0010) addr = 0x0000;
			if (addr === 0x0014) addr = 0x0004;
			if (addr === 0x0018) addr = 0x0008;
			if (addr === 0x001C) addr = 0x000C;
			this.tblPalette[addr] = this.data.v;
		}
	}
}

class ObjectAttributeEntry {
	y = 0x00;
	id = 0x00;
	attribute = 0x00;
	x = 0x00;
	
	reset(value = 0x00) {
		this.y = value;
		this.id = value;
		this.attribute = value;
		this.x = value;
	}
	
	cpy(oae) {
		this.y = oae.y;
		this.id = oae.id;
		this.attribute = oae.attribute;
		this.x = oae.x;
	}
}

class loopy_register {
	get reg() {
		let cx = this.coarse_x & 0b11111;
		let cy = this.coarse_y & 0b11111;
		let nx = this.nametable_x & 0b1;
		let ny = this.nametable_y & 0b1;
		let fy = this.fine_y & 0b111;
		let un = this.unused & 0b1;
		return (cx << 0) | (cy << 5) | (nx << 10) | (ny << 11) | (fy << 12) | (un << 15);
	}
	
	set reg(v) {
		this.coarse_x = (v &    0b0000000000011111) >> 0;
		this.coarse_y = (v &    0b0000001111100000) >> 5;
		this.nametable_x = (v & 0b0000010000000000) >> 10;
		this.nametable_y = (v & 0b0000100000000000) >> 11;
		this.fine_y = (v &      0b0111000000000000) >> 12;
		this.unused = (v &      0b1000000000000000) >> 15;
	}
	
	constructor(v) {
		this.reg = v;
	}
	
	coarse_x = 0b00000;
	
	coarse_y = 0b00000;
	
	nametable_x = 0b0;
	
	nametable_y = 0b0;
	
	fine_y = 0b000;
	
	unused = 0b0;
}

class PPUSTATUS {
	get reg() {
		return (this.unused << 0) | (this.sprite_overflow << 5) | (this.sprite_zero_hit << 6) | (this.vertical_blank << 7);
	}
	
	set reg(v) {
		this.unused = (v &          0b00011111) >> 0;
		this.sprite_overflow = (v & 0b00100000) >> 5;
		this.sprite_zero_hit = (v & 0b01000000) >> 6;
		this.vertical_blank = (v &  0b10000000) >> 7;
	}
	
	constructor(v) {
		this.reg = v;
	}
	
	unused = 0b00000;
	sprite_overflow  = 0b0;
	sprite_zero_hit  = 0b0;
	vertical_blank = 0b0;
}

class PPUMASK {
	get reg() {		
		return (this.grayscale << 0) | (this.render_background_left << 1) | (this.render_sprites_left << 2) | (this.render_background << 3) | (this.render_sprites << 4) | (this.enhance_red << 5) | (this.enhance_green << 6) | (this.enhance_blue << 7);
	}
	
	set reg(v) {
		this.grayscale = (v &              0b00000001) >> 0;
		this.render_background_left = (v & 0b00000010) >> 1;
		this.render_sprites_left = (v &    0b00000100) >> 2;
		this.render_background = (v &      0b00001000) >> 3;
		this.render_sprites = (v &         0b00010000) >> 4;
		this.enhance_red = (v &            0b00100000) >> 5;
		this.enhance_green = (v &          0b01000000) >> 6;
		this.enhance_blue = (v &           0b10000000) >> 7;
	}
	
	constructor(v) {
		this.reg = v;
	}
	
	grayscale = 0b0;
	render_background_left = 0b0;
	render_sprites_left = 0b0;
	render_background = 0b0;
	render_sprites = 0b0;
	enhance_red = 0b0;
	enhance_green = 0b0;
	enhance_blue = 0b0;
}

class PPUCTRL {
	get reg() {
		return (this.nametable_x << 0) | (this.nametable_y << 1) | (this.increment_mode << 2) | (this.pattern_sprite << 3) | (this.pattern_background << 4) | (this.sprite_size << 5) | (this.slave_mode << 6) | (this.enable_nmi << 7);
	}
	
	set reg(v) {
		this.nametable_x = (v &        0b00000001) >> 0;
		this.nametable_y = (v &        0b00000010) >> 1;
		this.increment_mode = (v &     0b00000100) >> 2;
		this.pattern_sprite = (v &     0b00001000) >> 3;
		this.pattern_background = (v & 0b00010000) >> 4;
		this.sprite_size = (v &        0b00100000) >> 5;
		this.slave_mode = (v &         0b01000000) >> 6;
		this.enable_nmi = (v &         0b10000000) >> 7;
	}
	
	constructor(v) {
		this.reg = v;
	}
	
	nametable_x = 0b0;
	nametable_y = 0b0;
	increment_mode = 0b0;
	pattern_sprite = 0b0;
	pattern_background = 0b0;
	sprite_size = 0b0;
	slave_mode = 0b0;
	enable_nmi = 0b0;
}