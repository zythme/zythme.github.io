class sequencerVRC6 {
	step = 0x0;
	duty = 0x0;
	timer = 0x0000;
	reload = 0x0000;
	acc = 0x00;
	output = 0x00;
	mode = 0x00;
	halt = false;
	freqShift = 0;
	
	clock(enable, funcManip) {
		if (enable) {
			this.timer--;
			if (this.timer == -1) {
				this.timer = this.reload & 0xFFFF;
				this.timer = this.timer >> this.freqShift;
				if (this.halt) return this.output;
				funcManip(this);
			}
		} else {
			this.output = 0;
			this.step = 0xF;
			this.acc = 0x00;
		}
		
		return this.output;
	}
}

class Mapper_NSF extends Mapper {
	banks = [0, 0, 0, 0, 0, 0, 0, 0]
	expansions = 0x00;
	bankswitch = false;
	RAMStatic = new Uint8Array(0x2000);
	
	
	// expansion audio
	
	length_lookup = [10,254, 20,  2, 40,  4, 80,  6, 160,  8, 60, 10, 14, 12, 26, 14,
									 12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30];
	
	pulseMMC51Seq = new sequencer();
	pulseMMC51Env = new envelope();
	pulseMMC51Cnt = new length_counter();
	pulseMMC51Sample = 0;
	
	pulseMMC52Seq = new sequencer();
	pulseMMC52Env = new envelope();
	pulseMMC52Cnt = new length_counter();
	pulseMMC52Sample = 0;
	
	pulseVRC61Seq = new sequencerVRC6();
	pulseVRC61Enable = false;
	pulseVRC61Volume = 15;
	pulseVRC61Sample = 0;
	
	pulseVRC62Seq = new sequencerVRC6();
	pulseVRC62Enable = false;
	pulseVRC62Volume = 15;
	pulseVRC62Sample = 0;
	
	sawVRC6Seq = new sequencerVRC6();
	sawVRC6Enable = false;
	sawVRC6Volume = 42;
	sawVRC6Sample = 0;
	
	clockCounter = 0;
	frameClockCounter = 0;
	
	constructor(ex, bs) {
		super(8, 0)
		this.expansions = ex;
		this.bankswitch = bs;
	}
	
	cpuMapRead(addr, mapped_addr, data) {
		if (addr >= 0x6000 && addr <= 0x7FFF) {
			mapped_addr.v = 0xFFFFFFFF;
			
			data.v = this.RAMStatic[addr & 0x1FFF];
			
			return true;
		}
		
		if (this.bankswitch) {
			if (addr >= 0x8000 && addr <= 0xFFFF) {
				mapped_addr.v = (this.banks[((addr&0xF000)-0x8000)/0x1000] * 0x1000) + (addr & 0x0FFF);
				return true;
			}
		} else {
			if (addr >= 0x8000 && addr <= 0xFFFF) {
				mapped_addr.v = addr - 0x8000;
				return true;
			}
		}
		
		return false;
	}
	
	cpuMapWrite(addr, mapped_addr, data) {
		if (addr >= 0x6000 && addr <= 0x7FFF) {
			mapped_addr.v = 0xFFFFFFFF;
			
			this.RAMStatic[addr & 0x1FFF] = data.v;
			
			return true;
		}
		
		if (addr >= 0x5FF8 && addr <= 0x5FFF) {
			this.banks[addr - 0x5FF8] = data.v;
			
			return true;
		}
		
		if (this.expansions & 0b0001000) { // MMC5
			switch (addr) {
			case 0x5000:
				switch ((data.v & 0xC0) >> 6) {
				case 0x00: this.pulseMMC51Seq.new_seq = 0b00000001; break;
				case 0x01: this.pulseMMC51Seq.new_seq = 0b00000011; break;
				case 0x02: this.pulseMMC51Seq.new_seq = 0b00001111; break;
				case 0x03: this.pulseMMC51Seq.new_seq = 0b11111100; break;
				}
				
				this.pulseMMC51Env.loop = (data.v >> 5) & 0x1;
				this.pulseMMC51Cnt.halt = (data.v >> 5) & 0x1;
				
				this.pulseMMC51Env.constant = (data.v >> 4) & 0x1;
				
				this.pulseMMC51Env.reload = data.v & 0x0F;
				break;
				
			case 0x5002:
				this.pulseMMC51Seq.reload = (this.pulseMMC51Seq.reload & 0xFF00) | data.v;
				break;
				
			case 0x5003:
				if (this.pulseMMC51Cnt.enable) this.pulseMMC51Cnt.counter = this.length_lookup[(data.v & 0xF8) >> 3];
				this.pulseMMC51Seq.seq_pos = 0;
				
				this.pulseMMC51Env.start = 1;
				
				this.pulseMMC51Seq.reload = (data.v & 0x07) << 8 | (this.pulseMMC51Seq.reload & 0x00FF);
				break;
				
			case 0x5004:
				switch ((data.v & 0xC0) >> 6) {
				case 0x00: this.pulseMMC52Seq.new_seq = 0b00000001; break;
				case 0x01: this.pulseMMC52Seq.new_seq = 0b00000011; break;
				case 0x02: this.pulseMMC52Seq.new_seq = 0b00001111; break;
				case 0x03: this.pulseMMC52Seq.new_seq = 0b11111100; break;
				}
				
				this.pulseMMC52Env.loop = (data.v >> 5) & 0x1;
				this.pulseMMC52Cnt.halt = (data.v >> 5) & 0x1;
				
				this.pulseMMC52Env.constant = (data.v >> 4) & 0x1;
				
				this.pulseMMC52Env.reload = data.v & 0x0F;
				break;
				
			case 0x5006:
				this.pulseMMC52Seq.reload = (this.pulseMMC52Seq.reload & 0xFF00) | data.v;
				break;
				
			case 0x5007:
				if (this.pulseMMC52Cnt.enable) this.pulseMMC52Cnt.counter = this.length_lookup[(data.v & 0xF8) >> 3];
				this.pulseMMC52Seq.seq_pos = 0;
				
				this.pulseMMC52Env.start = 1;
				
				this.pulseMMC52Seq.reload = (data.v & 0x07) << 8 | (this.pulseMMC52Seq.reload & 0x00FF);
				break;
				
			case 0x5015:
				this.pulseMMC51Cnt.enable = (data.v >> 0) & 0x01;
				this.pulseMMC52Cnt.enable = (data.v >> 1) & 0x01;
				
				this.pulseMMC51Cnt.counter *= (data.v >> 0) & 0x01;
				this.pulseMMC52Cnt.counter *= (data.v >> 1) & 0x01;
				break;
			}
		}
		
		if (this.expansions & 0b0000001) { // VRC6
			switch (addr) {
			case 0x9003:
				this.pulseVRC61Seq.halt = data.v & 0x01;
				this.pulseVRC62Seq.halt = data.v & 0x01;
				this.sawVRC6Seq.halt = data.v & 0x01;
				
				this.pulseVRC61Seq.freqShift = (data.v & 0x02) ? 4 : 0;
				this.pulseVRC62Seq.freqShift = (data.v & 0x02) ? 4 : 0;
				this.sawVRC6Seq.freqShift = (data.v & 0x02) ? 4 : 0;
				
				this.pulseVRC61Seq.freqShift = (data.v & 0x04) ? 8 : this.pulseVRC61Seq.freqShift;
				this.pulseVRC62Seq.freqShift = (data.v & 0x04) ? 8 : this.pulseVRC62Seq.freqShift;
				this.sawVRC6Seq.freqShift = (data.v & 0x04) ? 8 : this.sawVRC6Seq.freqShift;
				break;
			
			case 0x9000:
				this.pulseVRC61Volume = data.v & 0xF;
				this.pulseVRC61Seq.duty = (data.v & 0x70) >> 4;
				this.pulseVRC61Seq.mode = (data.v & 0x80) ? true : false;
				break;
			
			case 0xA000:
				this.pulseVRC62Volume = data.v & 0xF;
				this.pulseVRC62Seq.duty = (data.v & 0x70) >> 4;
				this.pulseVRC62Seq.mode = (data.v & 0x80) ? true : false;
				break;
			
			case 0xB000:
				this.sawVRC6Volume = data.v & 0x3F;
				break;
			
			case 0x9001:
				this.pulseVRC61Seq.reload = (this.pulseVRC61Seq.reload & 0xF00) | data.v;
				break;
			
			case 0xA001:
				this.pulseVRC62Seq.reload = (this.pulseVRC62Seq.reload & 0xF00) | data.v;
				break;
			
			case 0xB001:
				this.sawVRC6Seq.reload = (this.sawVRC6Seq.reload & 0xF00) | data.v;
				break;
			
			case 0x9002:
				this.pulseVRC61Seq.reload = ((data.v & 0xF) << 8) | (this.pulseVRC61Seq.reload & 0xFF);
				this.pulseVRC61Enable = (data.v & 0x80) ? true : false;
				break;
			
			case 0xA002:
				this.pulseVRC62Seq.reload = ((data.v & 0xF) << 8) | (this.pulseVRC62Seq.reload & 0xFF);
				this.pulseVRC62Enable = (data.v & 0x80) ? true : false;
				break;
			
			case 0xB002:
				this.sawVRC6Seq.reload = ((data.v & 0xF) << 8) | (this.sawVRC6Seq.reload & 0xFF);
				this.sawVRC6Enable = (data.v & 0x80) ? true : false;
				break;
			}
		}
		
		return false;
	}
	
	ppuMapRead(addr, mapped_addr) {
		if (addr >= 0x0000 && addr <= 0x1FFF) {
			mapped_addr.v = addr;
			return true;
		}
		
		return false;
	}
	
	ppuMapWrite(addr, mapped_addr) {
		if (addr >= 0x0000 && addr <= 0x1FFF) {
			if (this.CHRBanks == 0) {
				mapped_addr.v = addr;
				return true;
			}
		}
		
		return false;
	}
	
	reset() {
		
	}
	
	soundClock() {
		if (!this.expansions) return;
		
		let quarterFrameClock = false;
		let halfFrameClock = false;
		
		if (this.clockCounter % 6 == 0) {
			this.frameClockCounter++;
			
			if (this.frameClockCounter == 3729) {
				quarterFrameClock = true;
			}
			
			if (this.frameClockCounter == 7457) {
				quarterFrameClock = true;
				halfFrameClock = true;
			}
			
			if (this.frameClockCounter == 11186) {
				quarterFrameClock = true;
			}
			
			if (this.frameClockCounter == 14916) {
				quarterFrameClock = true;
				halfFrameClock = true;
				this.frameClockCounter = 0;
			}
			
			if (this.expansions & 0b0001000) {
				if (quarterFrameClock) {
					this.pulseMMC51Env.clock();
					this.pulseMMC51Env.clock();
					this.pulseMMC51Cnt.clock();
					this.pulseMMC51Cnt.clock();
				}
				
				this.pulseMMC51Seq.clock(function(s) {
					s.output = (s.sequence & (0b10000000 >> s.seq_pos)) >> (7 - s.seq_pos);
					s.seq_pos -= 1;
					if (s.seq_pos === -1) s.seq_pos = 7;
				});
				
				if (this.pulseMMC51Seq.output && this.pulseMMC51Cnt.counter && this.pulseMMC51Seq.reload > 7) {
					this.pulseMMC51Sample = this.pulseMMC51Env.constant ? this.pulseMMC51Env.reload : this.pulseMMC51Env.volume;
				} else {
					this.pulseMMC51Sample = 0;
				}
				
				this.pulseMMC52Seq.clock(function(s) {
					s.output = (s.sequence & (0b10000000 >> s.seq_pos)) >> (7 - s.seq_pos);
					s.seq_pos -= 1;
					if (s.seq_pos === -1) s.seq_pos = 7;
				});
				
				if (this.pulseMMC52Seq.output && this.pulseMMC52Cnt.counter && this.pulseMMC52Seq.reload > 7) {
					this.pulseMMC52Sample = this.pulseMMC52Env.constant ? this.pulseMMC52Env.reload : this.pulseMMC52Env.volume;
				} else {
					this.pulseMMC52Sample = 0;
				}
			}
		}
		
		if (this.clockCounter % 3 == 0) {
			if (this.expansions & 0b0000001) {
				// Konami VRC6 expansion
				
				this.pulseVRC61Seq.clock(this.pulseVRC61Enable, function(s) {
					s.output = s.mode ? 1 : (s.step <= s.duty ? 1 : 0);
					s.step--;
					if (s.step == -1) {
						s.step = 0xF;
					}
				});
				
				this.pulseVRC61Sample = this.pulseVRC61Seq.output * this.pulseVRC61Volume;
				
				this.pulseVRC62Seq.clock(this.pulseVRC62Enable, function(s) {
					s.output = s.mode ? 1 : (s.step <= s.duty ? 1 : 0);
					s.step--;
					if (s.step == -1) {
						s.step = 0xF;
					}
				});
				
				this.pulseVRC62Sample = this.pulseVRC62Seq.output * this.pulseVRC62Volume;
				
				let sawVRC6Volume = this.sawVRC6Volume;
				
				this.sawVRC6Seq.clock(this.sawVRC6Enable, function(s) {
					if (s.step == 15) s.step = 0;
					
					if (s.step % 2 == 0 && s.step !== 0) {
						s.acc = (s.acc + sawVRC6Volume) & 0xFF;
						s.output = s.acc >> 3;
					}
					
					if (s.step == 14) {
						s.step = 0;
						s.acc = 0;
					}
					
					s.step++;
				});
				
				this.sawVRC6Sample = this.sawVRC6Seq.output;
			}
		}
		
		this.clockCounter++;
	}
	
	GetOutputSample() {
		let mmc5_out = (95.98) / ((8128 / (this.pulseMMC51Sample + this.pulseMMC52Sample)) + 100);
		
		let vrc6_out = (95.98) / ((8128 / (this.pulseVRC61Sample + this.pulseVRC62Sample + this.sawVRC6Sample)) + 100);
		// i was using the version above, until i realized that nesdev says " The DAC of the VRC6, unlike the 2A03, appears to be linear."
		// but it didnt seem to mention how the saw accumulator was mixed in so im going to continue using it
		//let vrc6_out = (this.pulseVRC61Sample + this.pulseVRC62Sample + this.sawVRC6Sample) / 236
		
		return -mmc5_out - vrc6_out;
	}
}
