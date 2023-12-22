class Header {
	name = new Uint8Array(4);
	prg_rom_chunks = new uint8();
	chr_rom_chunks = new uint8();
	mapper1 = new uint8();
	mapper2 = new uint8();
	prg_ram_size = new uint8();
	tv_system1 = new uint8;
	tv_system2 = new uint8;
	unused = new Uint8Array(5);
}

class Cartridge {
	PRGMemory = new Uint8Array();
	CHRMemory = new Uint8Array();
	
	mapperID = 0;
	PRGBanks = 0;
	CHRBanks = 0;
	
	mapper = null;
	hw_mirror = 0;
	
	imageValid = false;
	errorCode = 'An error occured while loading the rom!';
	
	type = 'nes'
	mode = 0; // (0: NTSC; 2: PAL; 1/3: dual compatible) for roms, (0: NTSC; 1: PAL; 2: dual compatible) for NSFs
	
	constructor(file) {
		let read_idx = 0;
		
		let nesstr = String.fromCharCode(file[0]) + String.fromCharCode(file[1]) + String.fromCharCode(file[2]) + String.fromCharCode(file[3]);
		let nsfstr = String.fromCharCode(file[0]) + String.fromCharCode(file[1]) + String.fromCharCode(file[2]) + String.fromCharCode(file[3]) + String.fromCharCode(file[4])
		
		if (nesstr == 'NES\x1A') {
			let header = new Header();
			header.name[0] = file[0];
			header.name[1] = file[1];
			header.name[2] = file[2];
			header.name[3] = file[3];
			
			header.prg_rom_chunks.v = file[4];
			header.chr_rom_chunks.v = file[5];
			header.mapper1.v = file[6];
			header.mapper2.v = file[7];
			header.prg_ram_size.v = file[8];
			header.tv_system1.v = file[9];
			header.tv_system2.v = file[10];
			
			header.unused[0] = file[11];
			header.unused[1] = file[12];
			header.unused[2] = file[13];
			header.unused[3] = file[14];
			header.unused[4] = file[15];
			
			read_idx = 16;
			
			if (header.mapper1 & 0x04) {
				read_idx = 512;
			}
			
			this.mapperID = ((header.mapper2.v >> 4) << 4) | (header.mapper1.v >> 4);
			this.hw_mirror = (header.mapper1.v & 0x01) ? MIRROR.VERTICAL : MIRROR.HORIZONTAL;
			
			let fileType = 1;
			if ((header.mapper2.v & 0x0C) == 0x08) fileType = 2;
			
			if (fileType == 0) {
				
			}
			
			if (fileType == 1) {
				this.PRGBanks = header.prg_rom_chunks.v;
				this.PRGMemory = new Uint8Array(this.PRGBanks * 16384);
				for (let i = 0; i < this.PRGMemory.length; i++) {
					this.PRGMemory[i] = file[read_idx + i];
				}
				read_idx += this.PRGMemory.length;
				
				this.CHRBanks = header.chr_rom_chunks.v;
				if (this.CHRBanks == 0) {
					this.CHRMemory = new Uint8Array(8192);
				} else {
					this.CHRMemory = new Uint8Array(this.CHRBanks * 8192);
				}
				
				for (let i = 0; i < this.CHRMemory.length; i++) {
					this.CHRMemory[i] = file[read_idx + i];
				}
				
				read_idx += this.CHRMemory.length;
			}
			
			if (fileType == 2) {
				this.PRGBanks = ((header.prg_ram_size.v & 0x07) << 8) | header.prg_rom_chunks.v;
				this.PRGMemory = new Uint8Array(this.PRGBanks * 16384);
				for (let i = 0; i < this.PRGMemory.length; i++) {
					this.PRGMemory[i] = file[read_idx + i];
				}
				read_idx += this.PRGMemory.length;
				
				this.CHRBanks = ((header.prg_ram_size.v & 0x38) << 8) | header.prg_rom_chunks.v;
				this.CHRMemory = new Uint8Array(this.CHRBanks * 8192);
				for (let i = 0; i < this.CHRMemory.length; i++) {
					this.CHRMemory[i] = file[read_idx + i];
				}
				read_idx += this.CHRMemory.length;
			}
			
			switch(this.mapperID) {
			case  0: this.mapper = new Mapper_000(this.PRGBanks, this.CHRBanks); break;
			case  1: this.mapper = new Mapper_001(this.PRGBanks, this.CHRBanks); break;
			case  2: this.mapper = new Mapper_002(this.PRGBanks, this.CHRBanks); break;
			case  3: this.mapper = new Mapper_003(this.PRGBanks, this.CHRBanks); break;
			case  4: this.mapper = new Mapper_004(this.PRGBanks, this.CHRBanks); break;
			case  7: this.mapper = new Mapper_007(this.PRGBanks, this.CHRBanks); break;
			case 31: this.mapper = new Mapper_031(this.PRGBanks, this.CHRBanks); break;
			case 66: this.mapper = new Mapper_066(this.PRGBanks, this.CHRBanks); break;
			default: this.errorCode = 'Mapper ' + this.mapperID + ' not supported!'; return;
			}
			
			this.mode1 = header.tv_system1 & 0x1;
			this.mode2 = header.tv_system2 & 0x3;
			
			this.imageValid = true;
		} else if (nsfstr == 'NESM\x1A') {
			this.version = file[5];
			if (this.version != 0x01) {
				if (!confirm('This NSF does not appear to be in regular NSF format, however it may still be playable. Continue?')) {
					this.errorCode = 'Cancelled.'
					return;
				}
			}
			
			this.songs = file[6];
			this.start = file[7];
			
			this.loadaddr = (file[0x9] << 8) | file[0x8];
			this.initaddr = (file[0xB] << 8) | file[0xA];
			this.playaddr = (file[0xD] << 8) | file[0xC];
			
			this.name = '';
			this.artist = '';
			this.copyright = '';
			
			for (let i = 0x00E; i < 0x2E; i++) {
				if (file[i] == 0x00) break;
				this.name += String.fromCharCode(file[i]);
			}
			
			for (let i = 0x02E; i < 0x4E; i++) {
				if (file[i] == 0x00) break;
				this.artist += String.fromCharCode(file[i]);
			}
			
			for (let i = 0x04E; i < 0x6E; i++) {
				if (file[i] == 0x00) break;
				this.copyright += String.fromCharCode(file[i]);
			}
			
			this.name = (this.name.length == 0) ? '<?>' : this.name;
			this.artist = (this.artist.length == 0) ? '<?>' : this.artist;
			this.copyright = (this.copyright.length == 0) ? '<?>' : this.copyright;
			
			
			this.ntscspeed = (file[0x6F] << 8) | file[0x6E];
			
			this.bankswitchvalues = [file[0x70], file[0x71], file[0x72], file[0x73], file[0x74], file[0x75], file[0x76], file[0x77]]
			
			this.palspeed = (file[0x79] << 8) | file[0x78];
			
			this.mode = file[0x7A] & 0x03;
			
			this.expansion = file[0x7B] & 0x7F;
			
			if (this.expansion & 0b1110110) {/* will be masked by non supported expansions
																					bit 0: VRC6
																					bit 1: VRC7
																					bit 2: FDS
																					bit 3: MMC5
																					bit 4: Namco 163
																					bit 5: Sunsoft 5B
																					bit 6: VT02+*/
				if (!confirm('This NSF uses sound chips not yet supported, continue?')) {
					this.errorCode = 'Cancelled.'
					return;
				}
			}
			
			let data_length = (file[0x7D] << 16) | (file[0x7E] << 8) | file[0x7F];
			let bankswitch = false;
			
			// header has been read, now load data
			if (this.bankswitchvalues.reduce((a, b) => a + b)) {
				// after spending a while debugging my bankswitching implementation,
				// i realized i loaded the bank switch init values from the wrong addresses
				// which made non bank switching NSFs appear to bankswitch
				
				//this.errorCode = 'This NSF uses bankswitching which is not supported'
				//return
				
				let padding = this.loadaddr & 0xFFF;
				this.PRGMemory = [];
				for (let i = 0; i < padding; i++) {
					this.PRGMemory.push(0x00);
				}
				
				data_length = file.length - 0x80;
				for (let i = 0; i < data_length; i++) {
					this.PRGMemory.push(file[0x80 + i]);
				}
				
				padding = data_length - Math.floor(data_length/0x1000) * 0x1000;
				for (let i = 0; i < padding; i++) {
					this.PRGMemory.push(0x00);
				}
				
				bankswitch = true
			} else {
				let padding = this.loadaddr - 0x8000;
				this.PRGMemory = [];
				for (let i = 0; i < padding; i++) {
					this.PRGMemory.push(0x00);
				}
				
				data_length = data_length ? data_length : file.length - 0x80;
				
				for (let i = 0; i < data_length; i++) {
					this.PRGMemory.push(file[0x80 + i]);
				}
			}
			
			this.mapper = new Mapper_NSF(this.expansion, bankswitch);
			this.type = "nsf"
			this.imageValid = true;
		} else {
			this.errorCode = 'Not a valid rom!';
		}
	}
	
	mapped_addr = new uint32();
	
	cpuRead(addr, data) {
		this.mapped_addr.v = 0;
		if (this.mapper.cpuMapRead(addr, this.mapped_addr, data)) {
			if (this.mapped_addr.v === -1) {
				return true;
			} else {
				data.v = this.PRGMemory[this.mapped_addr.v];
			}
			//console.log("mapped to " + hex(this.mapped_addr.v, 8) + " out of " + hex(this.PRGMemory.length, 8))
			return true;
		} else {
			return false;
		}
	}
	
	cpuWrite(addr, data) {
		this.mapped_addr.v = 0;
		if (this.mapper.cpuMapWrite(addr, this.mapped_addr, data)) {
			if (this.mapped_addr.v === -1) {
				return true;
			} else {
				if (this.type == "nsf" ) {
					if (!(this.expansion & 0b100)) return;
				}
				
				this.PRGMemory[this.mapped_addr.v] = data.v;
			}
			return true;
		} else {
			return false;
		}
	}
	
	ppuRead(addr, data) {
		this.mapped_addr.v = 0;
		if (this.mapper.ppuMapRead(addr, this.mapped_addr)) {
			data.v = this.CHRMemory[this.mapped_addr.v];
			return true;
		} else {
			return false;
		}
	}
	
	ppuWrite(addr, data) {
		this.mapped_addr.v = 0;
		if (this.mapper.ppuMapWrite(addr, this.mapped_addr)) {
			this.CHRMemory[this.mapped_addr.v] = data.v;
			return true;
		} else {
			return false;
		}
	}
	
	reset() {
		if (this.mapper != null) {
			this.mapper.reset();
		}
	}
	
	Mirror() {
		let m = this.mapper.mirror();
		if (m === MIRROR.HARDWARE) {
			return this.hw_mirror;
		} else {
			return m;
		}
	}
	
	GetMapper() {
		return this.mapper;
	}
}