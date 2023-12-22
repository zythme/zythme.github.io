let cart = null;
let nes = new Bus();
let mapAsm = [];

let emulationRun = true;
let residualTime = 0;

let selectedPalette = 0x00;

function DrawRam(x, y, addr, rows, columns) {
	let ramX = x, ramY = y;
	for (let row = 0; row < rows; row++) {
		let offset = "$" + hex(addr, 4) + ":";
		for (let col = 0; col < columns; col++) {
			offset += " " + hex(nes.cpuRead(addr, true), 2);
			addr += 1;
		}
		DrawString(ramX, ramY, offset);
		ramY += 10;
	}
}

function DrawCpu(x, y) {
	let status = "STATUS: ";
	DrawString(x, y , "STATUS:", colors.WHITE);
	DrawString(x + 64, y, "N", nes.cpu.status & FLAGS6502.N ? colors.GREEN : colors.RED);
	DrawString(x + 80, y , "V", nes.cpu.status & FLAGS6502.V ? colors.GREEN : colors.RED);
	DrawString(x + 96, y , "-", nes.cpu.status & FLAGS6502.U ? colors.GREEN : colors.RED);
	DrawString(x + 112, y , "B", nes.cpu.status & FLAGS6502.B ? colors.GREEN : colors.RED);
	DrawString(x + 128, y , "D", nes.cpu.status & FLAGS6502.D ? colors.GREEN : colors.RED);
	DrawString(x + 144, y , "I", nes.cpu.status & FLAGS6502.I ? colors.GREEN : colors.RED);
	DrawString(x + 160, y , "Z", nes.cpu.status & FLAGS6502.Z ? colors.GREEN : colors.RED);
	DrawString(x + 178, y , "C", nes.cpu.status & FLAGS6502.C ? colors.GREEN : colors.RED);
	DrawString(x, y + 10, "PC: $" + hex(nes.cpu.pc, 4));
	DrawString(x, y + 20, "A: $" +  hex(nes.cpu.a, 2) + "  [" + nes.cpu.a + "]");
	DrawString(x, y + 30, "X: $" +  hex(nes.cpu.x, 2) + "  [" + nes.cpu.x + "]");
	DrawString(x, y + 40, "Y: $" +  hex(nes.cpu.y, 2) + "  [" + nes.cpu.y + "]");
	DrawString(x, y + 50, "Stack P: $" + hex(nes.cpu.stkp, 4));
}

function DrawCode(x, y, lines) {
	let it_a = mapAsm.findNext(nes.cpu.pc);
	let lineY = (lines >> 1) * 10 + y;
	if (it_a != mapAsm.length) {
		DrawString(x, lineY, mapAsm[it_a], colors.CYAN);
		while (lineY < (lines * 10) + y) {
			lineY += 10;
			it_a = mapAsm.findNext(it_a + 1);
			if (it_a != mapAsm.length) {
				DrawString(x, lineY, mapAsm[it_a]);
			}
		}
	}
	
	it_a = mapAsm.findNext(nes.cpu.pc);
	lineY = (lines >> 1) * 10 + y;
	if (it_a != mapAsm.length) {
		DrawString(x, lineY, mapAsm[it_a], colors.CYAN);
		while (lineY > y) {
			lineY -= 10;
			it_a = mapAsm.findPrevious(it_a - 1);
			if (it_a != mapAsm.length) {
				DrawString(x, lineY, mapAsm[it_a]);
			}
		}
	}
}

let selecting = true;
let selection = localStorage.getItem('selection') || "Select a file";

let speeds = [1, 3, 6, 12, 25, 50, 75, 100, 150, 200, 300, 400, 800, 1600, 3200, 6400];
let selectedspeed = 7;

let samplerates = [44100/4, 44100/2, 44100/1]
let selectedsamplerate = 0

let pause = false

function start() {
	width = 780;
	height = 480;
	//cart = new Cartridge("smb2.nes");
	
	//nes.insertCartridge(cart);
	
	//mapAsm = nes.cpu.disassemble(0x0000, 0xFFFF);
	//nes.SetSampleFrequency(audioContext.sampleRate);
	
	//nes.reset();
	return true;
}

function SoundOut() {
	if (!selecting && !pause) while (!nes.clock()) {};
	return nes.audioSample;
}

let errorCode = '';

function update(elapsedTime) {
	if (selecting) {
		Clear(colors.BLACK);
		DrawString(64, 64, "Select a rom: ", colors.WHITE, 2);
		DrawString(64, 32, errorCode, colors.RED, 2);
		let space = localStorageSpace();
		DrawString(16, 450, "Used " + Math.ceil(space.used/1024) + " KB out of 5120 KB. " + Math.ceil(space.left/1024) + " KB remaining.", colors.WHITE, 2);
		let off = 32;
		
		let found_selection = false;
		let next_selection = undefined;
		
		let first_rom = undefined;
		let found_first = false;
		
		for (const rom in nesroms) {
			if (!found_first) {
				first_rom = rom;
				found_first = true;
			}
			
			if (found_selection) {
				next_selection = rom;
				found_selection = false;
			}
			
			if (selection == rom) {
				DrawString(64 + 16, 64 + off, ">", colors.WHITE, 2);
				found_selection = true;
			}
			
			DrawString(64 + 32, 64 + off, rom, (selection == rom) ? colors.WHITE : colors.DARK_GREY, 2);
			off += 20
		}
		
		if (selection != "Select a file") {
			DrawString(580, 360, "Selection:", colors.WHITE, 1);
			DrawString(580, 370, "ROM File Size: " + Math.ceil(localStorage.getItem(selection).length / 512) + " KB", colors.WHITE, 1);
			DrawString(580, 380, "ROM Save Size: " + (localStorage.hasOwnProperty(selection + 'save') ? Math.ceil(localStorage.getItem(selection + 'save').length / 512) + " KB" : "N/A"), colors.WHITE, 1);
			DrawString(580, 390, "Press backspace to delete", colors.WHITE, 1);
			if (localStorage.hasOwnProperty(selection + 'save')) {
				DrawString(580, 400, "Press the delete key to ", colors.WHITE, 1);
				DrawString(580, 410, "delete save.", colors.WHITE, 1);
				if (pressedKeys["Delete"]) {
					if (localStorage.hasOwnProperty(selection + 'save')) {
						localStorage.removeItem(selection + 'save');
					}
				}
			}
			
			if (pressedKeys["Backspace"]) {
				localStorage.removeItem(selection);
				if (localStorage.hasOwnProperty(selection + 'save')) {
					localStorage.removeItem(selection + 'save');
				}
				let roms = romStorage.split('/');
				roms.splice(roms.indexOf(selection), 1);
				romStorage = roms.join('/');
				if (romStorage[romStorage.length - 1] != '/') {
					romStorage += '/';
				}
				localStorage.setItem('roms', romStorage);
				delete nesroms[selection];
				selection = "Select a file";
				localStorage.setItem('selection', selection);
				if (romStorage == '/') {
					localStorage.clear();
				}
			}
		}
		
		DrawString(512, 64, "Emulation speed: ", colors.WHITE, 1);
		DrawString(512, 84, "<", selectedspeed ? colors.WHITE : colors.DARK_GREY, 1);
		DrawString(630, 84, ">", selectedspeed < speeds.length - 1 ? colors.WHITE : colors.DARK_GREY, 1);
		DrawString(564, 84, speeds[selectedspeed] + '%', colors.WHITE, 1);
		
		DrawString(512, 104, "Sample rate: ", colors.WHITE, 1);
		DrawString(512, 124, "<", selectedsamplerate ? colors.WHITE : colors.DARK_GREY, 1);
		DrawString(630, 124, ">", selectedsamplerate < samplerates.length - 1 ? colors.WHITE : colors.DARK_GREY, 1);
		DrawString(544, 124, samplerates[selectedsamplerate] + 'Hz', colors.WHITE, 1);
		
		if (pressedKeys["-"] || pressedKeys["_"]) {
			selectedspeed = Math.max(0, selectedspeed - 1);
		}
			
		if (pressedKeys["="] || pressedKeys["+"]) {
			selectedspeed = Math.min(speeds.length - 1, selectedspeed + 1);
		}
		
		if (pressedKeys["a"] || pressedKeys["ArrowLeft"]) {
			selectedsamplerate = Math.max(0, selectedsamplerate - 1);
		}
		
		if (pressedKeys["d"] || pressedKeys["ArrowRight"]) {
			selectedsamplerate = Math.min(samplerates.length - 1, selectedsamplerate + 1);
		}
		
		if (pressedKeys["Shift"]) {
			if (next_selection) {
				selection = next_selection;
			} else {
				selection = first_rom;
			}
		}
		
		if (pressedKeys["Enter"] || debug) {
			if (debug) {
				speed = 1 / (speeds[selectedspeed] / 100);
				
				cart = new Cartridge(debugRom);
				
				if (cart.imageValid) {
					let filestr = bytesToStr(debugRom);
					let savestr = '';
					if (cart.mapperID == 1) {
						savestr = bytesToStr(new Uint8Array(32 * 1024).map(e => { return 255; }) );
					}
					
					if (Math.ceil((filestr + savestr).length / 512) <= space.left) {
						localStorage.setItem(debugName, filestr);
						if (!nesroms.hasOwnProperty(debugName)) {
							localStorage.setItem('roms', romStorage + debugName + '/');
						}
						localStorage.setItem('selection', debugName);
					} else {
						alert('File will not be added to the list because it is too large! (Size: ' + Math.ceil((filestr + savestr).length / 512) + ' KB, Space remaining: ' + space.left + ' KB)');
					}
					
					nes.insertCartridge(cart);
					
					audioContext = new AudioContext({latencyHint: 50/1000, sampleRate: samplerates[selectedsamplerate]});
					startContext();
					nes.SetSampleFrequency(audioContext.sampleRate);
					
					nes.reset();
					selecting = false;
				} else {
					errorCode = 'Error: ' + cart.errorCode;
				}
				return;
			}
			if (selection == "Select a file") {
				let input = document.createElement('input');
				input.accept = '.nes,.nsf';
				input.multiple = false;
				input.type = 'file';
				
				input.onchange = e => {
					let file = e.target.files[0]; 
					let name = file.name;
					
					let reader = new FileReader();
					
					reader.onload = readerEvent => {
						speed = 1 / (speeds[selectedspeed] / 100);
						
						let romData = new Uint8Array(readerEvent.target.result);
						
						cart = new Cartridge(romData);
						
						if (cart.imageValid) {
							let filestr = bytesToStr(romData);
							let savestr = '';
							if (cart.mapperID == 1) {
								savestr = bytesToStr(new Uint8Array(32 * 1024).map(e => { return 255; }) );
							}
							
							if (Math.ceil((filestr + savestr).length / 512) <= space.left) {
								localStorage.setItem(name, filestr);
								console.log(nesroms);
								if (!nesroms.hasOwnProperty(name)) {
									localStorage.setItem('roms', romStorage + name + '/');
								}
								localStorage.setItem('selection', name);
							} else {
								alert('File will not be added to the list because it is too large! (Size: ' + Math.ceil((filestr + savestr).length / 512) + ' KB, Space remaining: ' + space.left + ' KB)');
							}
							
							nes.insertCartridge(cart);
							if (cart.type == "nsf") selectedsamplerate = 3
							audioContext = new AudioContext({latencyHint: 50/1000, sampleRate: samplerates[selectedsamplerate]});
							startContext();
							nes.SetSampleFrequency(audioContext.sampleRate);
							
							nes.reset();
							selecting = false;
							
							if (cart.type == "nsf") {
								nes.mode = cart.mode & 0x1;
								currentSong = cart.start;
								NSFInitSong(currentSong);
								nes.nsfMode = true;
							}
						} else {
							errorCode = 'Error: ' + cart.errorCode;
						}
					}
					
					reader.readAsArrayBuffer(file);
				}
				
				input.click();
			} else {
				speed = 1 / (speeds[selectedspeed] / 100);
				
				cart = new Cartridge(nesroms[selection]);
				
				localStorage.setItem('selection', selection);
				
				if (cart.imageValid) {
					if (localStorage.hasOwnProperty(selection + 'save')) {
						cart.mapper.RAMStatic = strToBytes(localStorage.getItem(selection + 'save'));
					}
					
					nes.insertCartridge(cart);
					if (cart.type == "nsf") selectedsamplerate = 3
					audioContext = new AudioContext({latencyHint: 50/1000, sampleRate: samplerates[selectedsamplerate]});
					startContext();
					nes.SetSampleFrequency(audioContext.sampleRate);
					
					nes.reset();
					selecting = false;
					
					if (cart.type == "nsf") {
						nes.mode = cart.mode & 0x1;
						currentSong = cart.start;
						NSFInitSong(currentSong);
						nes.nsfMode = true;
					}
				} else {
					errorCode = 'Error: ' + cart.errorCode;
				}
			}
		}
	} else {
		nes.SetSampleFrequency(audioContext.sampleRate * speed);
		if (cart.type == "nes") {
			EmulatorUpdateWithAudio(elapsedTime);
		} else {
			NSFUpdate(elapsedTime);
		}
	}
}

let currentSong = 1;

function NSFInitSong(song) {
	nes.cpu.pc = 0x0000;
	for (let i = 0x0000; i <= 0x07FF; i++) {
		nes.cpuWrite(i, 0x00);
	}
	
	for (let i = 0x6000; i <= 0x7FFF; i++) {
		nes.cpuWrite(i, 0x00);
	}
	
	for (let i = 0x4000; i <= 0x4013; i++) {
		nes.cpuWrite(i, 0x00);
	}
	
	nes.cpuWrite(0x4015, 0x00);
	nes.cpuWrite(0x4015, 0x0F);
	
	nes.cpuWrite(0x4017, 0x40);
	
	if (cart.mapper.bankswitch) {
		nes.cpuWrite(0x5FF8, cart.bankswitchvalues[0]);
		nes.cpuWrite(0x5FF9, cart.bankswitchvalues[1]);
		nes.cpuWrite(0x5FFA, cart.bankswitchvalues[2]);
		nes.cpuWrite(0x5FFB, cart.bankswitchvalues[3]);
		nes.cpuWrite(0x5FFC, cart.bankswitchvalues[4]);
		nes.cpuWrite(0x5FFD, cart.bankswitchvalues[5]);
		nes.cpuWrite(0x5FFE, cart.bankswitchvalues[6]);
		nes.cpuWrite(0x5FFF, cart.bankswitchvalues[7]);
	}
	
	nes.cpu.a = song - 1;
	nes.cpu.x = nes.mode;
	nes.cpu.y = 0;
	
	nes.cpu.addr_abs = cart.initaddr;
	nes.cpu.JSR();
	nes.nsfPlaySpeed = nes.mode ? cart.palspeed : cart.ntscspeed;
}

function EmulatorUpdateWithAudio(elapsedTime) {
	//if (!nes.ppu.status.vertical_blank) return;
	Clear(colors.DARK_BLUE);
	
	if (pressedKeys["-"] || pressedKeys["_"]) {
		selectedspeed = Math.max(0, selectedspeed - 1);
	}
		
	if (pressedKeys["="] || pressedKeys["+"]) {
		selectedspeed = Math.min(speeds.length - 1, selectedspeed + 1);
	}
	
	speed = 1 / (speeds[selectedspeed] / 100);
	
	nes.controller[0] = 0x00;
	nes.controller[0] |= heldKeys["x"]|| heldKeys["l"] ? 0x80 : 0x00;
	nes.controller[0] |= heldKeys["z"]|| heldKeys[","] ? 0x40 : 0x00;
	nes.controller[0] |= heldKeys["Shift"] ? 0x20 : 0x00;
	nes.controller[0] |= heldKeys["Enter"] ? 0x10 : 0x00;
	nes.controller[0] |= heldKeys["ArrowUp"] || heldKeys["w"] ? 0x08 : 0x00;
	nes.controller[0] |= heldKeys["ArrowDown"] || heldKeys["s"] ? 0x04 : 0x00;
	nes.controller[0] |= heldKeys["ArrowLeft"] || heldKeys["a"] ? 0x02 : 0x00;
	nes.controller[0] |= heldKeys["ArrowRight"] || heldKeys["d"] ? 0x01 : 0x00;
	
	//DrawString(516+178+18, 2, elapsedTime, elapsedTime > 16.66 ? (elapsedTime > 18 ? (elapsedTime > 20 ? colors.RED : colors.DARK_YELLOW) : colors.YELLOW) : colors.GREEN);
	
	if (pressedKeys[" "]) emulationRun = !emulationRun;
	if (pressedKeys["r"]) nes.reset();
	if (pressedKeys["p"]) nes.switchMode(audioContext.sampleRate * speed);//selectedPalette = (++selectedPalette) & 0x07;
	
	DrawCpu(516, 2);
	//DrawCode(516, 72, 26);
	
	DrawString(516, 62, "Emulator speed: " + speeds[selectedspeed] + "% (Mode: " + (nes.mode ? "PAL" : "NTSC") + ")", colors.WHITE, 1);
	
	if (nes.cart.mapperID == 1) {
		DrawString(516, 72, "Press F to save game.", colors.WHITE, 1);
		if (pressedKeys["f"]) {
			localStorage.setItem(selection + 'save', bytesToStr(cart.mapper.RAMStatic));
		}
	}
	
	/*for (let i = 0; i < 26; i++) {
		let s = hex(i, 2) + ": (" + nes.ppu.pOAM(i * 4 + 3).toString()
			+ ", " + nes.ppu.pOAM(i * 4 + 0).toString() + ") "
			+ "ID: " + hex(nes.ppu.pOAM(i * 4 + 1), 2)
			+" AT: " + hex(nes.ppu.pOAM(i * 4 + 2), 2);	
		DrawString(516, 72 + i * 10, s);
	}
	
	let swatchSize = 6;
	for (let p = 0; p < 8; p++) {
		for (let s = 0; s < 4; s++) {
			FillRect(516 + p * (swatchSize * 5) + s * swatchSize, 340,
				swatchSize, swatchSize, nes.ppu.GetColorFromPaletteRam(p, s));
		}
	}*/
	
	//DrawRect(516 + selectedPalette * (swatchSize * 5) - 1, 339, (swatchSize * 4), swatchSize, colors.WHITE);
	
	//DrawSprite(516, 348, nes.ppu.GetPatternTable(0, selectedPalette));
	//DrawSprite(648, 348, nes.ppu.GetPatternTable(1, selectedPalette));
	
	DrawSprite(0, -8 * screenscale * !nes.mode, nes.ppu.GetScreen(), 1, true);
	if (screenscale == 1) {
		FillRect(256, 0, 256, 480, colors.DARK_BLUE)
		FillRect(0, 240 - 16 * !nes.mode, 256, 240 + 16 * !nes.mode, colors.DARK_BLUE)
	} else if (!nes.mode) {
		FillRect(0, 448, 512, 32, colors.DARK_BLUE)
	}
//FillRect(0, nes.ppu.scanline, 256, 1, colors.WHITE)
//FillRect(nes.ppu.cycle, 0, 1, 256, colors.WHITE)
}

function NSFUpdate(elapsedTime) {
	Clear(colors.DARK_BLUE);
	
	if (pressedKeys["-"] || pressedKeys["_"]) {
		selectedspeed = Math.max(0, selectedspeed - 1);
	}
		
	if (pressedKeys["="] || pressedKeys["+"]) {
		selectedspeed = Math.min(speeds.length - 1, selectedspeed + 1);
	}
	
	speed = 1 / (speeds[selectedspeed] / 100);
	
	if (pressedKeys["ArrowLeft"] || pressedKeys["a"]) {
		currentSong--;
		if (currentSong < 1) currentSong = cart.songs;
		NSFInitSong(currentSong);
	}
	
	if (pressedKeys["ArrowRight"] || pressedKeys["d"]) {
		currentSong++;
		if (currentSong > cart.songs) currentSong = 1;
		NSFInitSong(currentSong);
	}
	
	//DrawString(516+178+18, 2, elapsedTime, elapsedTime > 16.66 ? (elapsedTime > 18 ? (elapsedTime > 20 ? colors.RED : colors.DARK_YELLOW) : colors.YELLOW) : colors.GREEN);
	if (pressedKeys[" "]) pause = !pause
	
	DrawCpu(516, 2);
	
	DrawString(516, 62, "Emulator speed: " + speeds[selectedspeed] + "% (Mode: " + (nes.mode ? "PAL" : "NTSC") + ")", colors.WHITE, 1);
	DrawString(516, 74, "Press SPACE to play/pause", colors.WHITE, 1);
	DrawString(516, 86, "Press left/right to change songs", colors.WHITE, 1);
	
	FillRect(0, 0, 512, 480, colors.BLACK)
	
	DrawString(12, 12, "Title: " + cart.name, colors.WHITE, 1);
	DrawString(12, 24, "Artist: " + cart.artist, colors.WHITE, 1);
	DrawString(12, 36, "Copyright: " + cart.copyright, colors.WHITE, 1);
	
	DrawString(12, 450, "Song " + currentSong + " of " + cart.songs, colors.WHITE, 2);
}

function EmulatorUpdateWithoutAudio(elapsedTime) {
	Clear(colors.DARK_BLUE);
	
	nes.controller[0] = 0x00;
	nes.controller[0] |= heldKeys["x"] ? 0x80 : 0x00;
	nes.controller[0] |= heldKeys["z"] ? 0x40 : 0x00;
	nes.controller[0] |= heldKeys["a"] ? 0x20 : 0x00;
	nes.controller[0] |= heldKeys["s"] ? 0x10 : 0x00;
	nes.controller[0] |= heldKeys["ArrowUp"] ? 0x08 : 0x00;
	nes.controller[0] |= heldKeys["ArrowDown"] ? 0x04 : 0x00;
	nes.controller[0] |= heldKeys["ArrowLeft"] ? 0x02 : 0x00;
	nes.controller[0] |= heldKeys["ArrowRight"] ? 0x01 : 0x00;
	
	if (emulationRun) {
		if (residualTime > 0) {
			residualTime -= elapsedTime;
		} else {
			//const t0 = performance.now();
			residualTime += (1000 / 60) - elapsedTime;
			
			do { nes.clock(); } while (!nes.ppu.frame_complete);
			nes.ppu.frame_complete = false;
			//const t1 = performance.now();
			//totalFrameTime = t1 - t0;
		}
	} else {
		if (pressedKeys["c"]) {
			do { nes.clock(); } while (!nes.cpu.complete());
			
			do { nes.clock(); } while (nes.cpu.complete());
		}
		
		if (pressedKeys["f"]) {
			do { nes.clock(); } while (!nes.ppu.frame_complete);
			
			do { nes.clock(); } while (nes.cpu.complete());
			
			nes.ppu.frame_complete = false;
		}
	}
	
	DrawString(516+178+18, 2, elapsedTime, elapsedTime > 16.66 ? (elapsedTime > 18 ? (elapsedTime > 20 ? colors.RED : colors.DARK_YELLOW) : colors.YELLOW) : colors.GREEN);
	
	if (pressedKeys["r"]) nes.reset();
	if (pressedKeys[" "]) emulationRun = !emulationRun;
	
	if (pressedKeys["p"]) selectedPalette = (++selectedPalette) & 0x07;
	
	mapAsm = nes.cpu.disassemble(0x0000, 0xFFFF);
	DrawCpu(516, 2);
	DrawCode(516, 72, 26);
	
	//DrawSprite(516, 348, nes.ppu.GetPatternTable(0, selectedPalette));
	//DrawSprite(648, 348, nes.ppu.GetPatternTable(1, selectedPalette));
	
	DrawSprite(0, 0, nes.ppu.GetScreen(), 1);
}