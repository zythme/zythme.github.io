class sequencer {
	sequence = 0x0000000;
	new_seq = 0x00000000;
	seq_pos = 0x00000000;
	timer = 0x0000;
	reload = 0x0000;
	output = 0x00;
	
	clock(funcManip) {
		if (true) {
			this.timer--;
			if (this.timer === -1) {
				this.timer = (this.reload + 1) & 0xFFFF;
				this.sequence = this.new_seq;
				funcManip(this);
			}
		}
		
		return this.output;
	}
}

class envelope {
	start = 0;
	volume = 0;
	reload = 0;
	decay_counter = 0;
	loop = 0;
	constant = 0;
	
	clock() {
		if (this.start) {
			this.start = 0;
			this.decay_counter = this.reload;
			this.volume = 0xF;
		} else {
			if (this.decay_counter === 0) {
				this.decay_counter = this.reload;
				if (this.volume > 0) {
					this.volume--;
				} else {
					this.volume = this.loop ? 0xF : 0;
				}
			} else {
				this.decay_counter--;
			}
		}
	}
}

class dmc_unit {
	shift_register = 0x00;
	silence = false;
	bits_remaining = 0x01;
	timer = 0x0000;
	reload = 0x00;
	output = 0x40;
	
	clock(funcManip) {
		if (true) {
			this.timer--;
			if (this.timer === -1) {
				this.timer = this.reload;
				funcManip(this);
			}
		}
		
		return this.output;
	}
}

class sweeper {
	divider = 0;
	reload_flag = 0;
	period = 0;
	target_period = 0;
	enable = 0;
	negate = 0;
	shift_count = 0;
	mute = 0;
	
	which = 0;
	channel = null;
	
	clock() {
		/*let changeAmount = this.channel.reload >> this.shift_count;
		if (this.negate) {
			changeAmount *= -1;
			changeAmount -= this.which;
		}
		
		this.target_period = this.channel.reload + changeAmount;
		
		if (this.channel.reload < 8 || this.target_period > 0x7FF) {
			this.mute = 1;
		} else {
			this.mute = 0;
		}
		
		if (this.divider === 0 && this.enable && !this.mute && this.shift_count !== 0) {
			this.channel.reload = this.target_period;
		}
		
		if (this.divider === 0 || this.reload_flag) {
			this.divider = this.period + 1;
			this.reload_flag = 0;
		} else {
			this.divider--;
		}*/
		// i still cant figure out why my code sometimes doesnt work (specifically, when dying in super mario bros)
		// for now ill just use the code from https://github.com/bfirsh/jsnes/blob/master/src/papu.js
		if (--this.divider <= 0) {
			this.divider = this.period + 1;
			if (
				this.enable &&
				this.shift_count > 0 &&
				this.channel.reload > 7
			) {
				this.mute = 0;
				if (this.negate === 0) {
					this.channel.reload += this.channel.reload >> this.shift_count;
					if (this.channel.reload > 4095) {
						this.channel.reload = 4095;
						this.mute = 1;
					}
				} else {
					this.channel.reload =
						this.channel.reload -
						((this.channel.reload >> this.shift_count) -
							(this.which ? 1 : 0));
				}
			}
		}
		
		if (this.reload_flag) {
			this.reload_flag = 0;
			this.divider = this.period + 1;
		}
	}
}

class length_counter {
	counter = 0;
	halt = 0;
	enable = 0;
	
	clock() {
		if (!this.enable) {
			this.counter = 0;
		}
		
		if (this.counter && !this.halt) {
			this.counter--;
		}
	}
}

class linear_counter {
	counter = 0;
	reload = 0;
	reload_flag = 0;
	control = 0;
	
	clock() {
		if (this.reload_flag) {
			this.counter = this.reload;
		} else if (this.counter !== 0) {
			this.counter--;
		}
		
		if (!this.control) {
			this.reload_flag = 0;
		}
	}
}

class lfsr {
	shift_register = 0x0000;
	mode = 0;
	timer = 0;
	reload = 0;
	
	clock() {
		this.timer--;
		if (this.timer === -1) {
			this.timer = (this.reload + 1) & 0xFFFF;
			
			let feedback = (this.shift_register & 0x1) ^ (this.mode ? (this.shift_register >> 6 & 0x1) : (this.shift_register >> 1 & 0x1))
			
			this.shift_register >>= 1;
			this.shift_register |= feedback << 14;
		}
		if (this.shift_register === 0) this.shift_register = 1;
	}
}

class nes2A03 {	
	cpuWrite(addr, data) {
		switch (addr) {
		case 0x4000:
			switch ((data & 0xC0) >> 6) {
			case 0x00: this.pulse1_seq.new_seq = 0b00000001; break;
			case 0x01: this.pulse1_seq.new_seq = 0b00000011; break;
			case 0x02: this.pulse1_seq.new_seq = 0b00001111; break;
			case 0x03: this.pulse1_seq.new_seq = 0b11111100; break;
			}
			
			this.pulse1_env.loop = (data >> 5) & 0x1;
			this.pulse1_cnt.halt = (data >> 5) & 0x1;
			
			this.pulse1_env.constant = (data >> 4) & 0x1;
			
			this.pulse1_env.reload = data & 0x0F;
			break;
			
		case 0x4001:
			this.pulse1_swp.enable = data >> 7;
			
			this.pulse1_swp.period = (data >> 4) & 0x7;
			
			this.pulse1_swp.negate = (data >> 3) & 0x1;
			
			this.pulse1_swp.shift_count = data & 0x7;
			
			this.pulse1_swp.reload_flag = 1;
			break;
			
		case 0x4002:
			this.pulse1_seq.reload = (this.pulse1_seq.reload & 0xFF00) | data;
			break;
			
		case 0x4003:
			if (this.pulse1_cnt.enable) this.pulse1_cnt.counter = this.length_lookup[(data & 0xF8) >> 3];
			this.pulse1_seq.seq_pos = 0;
			
			this.pulse1_env.start = 1;
			
			this.pulse1_seq.reload = (data & 0x07) << 8 | (this.pulse1_seq.reload & 0x00FF);
			break;
			
		case 0x4004:
			switch ((data & 0xC0) >> 6) {
			case 0x00: this.pulse2_seq.new_seq = 0b00000001; break;
			case 0x01: this.pulse2_seq.new_seq = 0b00000011; break;
			case 0x02: this.pulse2_seq.new_seq = 0b00001111; break;
			case 0x03: this.pulse2_seq.new_seq = 0b11111100; break;
			}
			
			this.pulse2_env.loop = (data >> 5) & 0x1;
			this.pulse2_cnt.halt = (data >> 5) & 0x1;
			
			this.pulse2_env.constant = (data >> 4) & 0x1;
			
			this.pulse2_env.reload = data & 0x0F;
			break;
			
		case 0x4005:
			this.pulse2_swp.enable = data >> 7;
			
			this.pulse2_swp.period = (data >> 4) & 0x7;
			
			this.pulse2_swp.negate = (data >> 3) & 0x1;
			
			this.pulse2_swp.shift_count = data & 0x7;
			
			this.pulse2_swp.reload_flag = 1;
			break;
			
		case 0x4006:
			this.pulse2_seq.reload = (this.pulse2_seq.reload & 0xFF00) | data;
			break;
			
		case 0x4007:
			if (this.pulse2_cnt.enable) this.pulse2_cnt.counter = this.length_lookup[(data & 0xF8) >> 3];
			this.pulse2_seq.seq_pos = 0;
			
			this.pulse2_env.start = 1;
			
			this.pulse2_seq.reload = (data & 0x07) << 8 | (this.pulse2_seq.reload & 0x00FF);
			break;
			
		case 0x4008:
			this.triang_lnc.control = data >> 7;
			this.triang_cnt.halt = data >> 7;
			
			this.triang_lnc.reload = data & 0x7F;
			break;
			
		case 0x400A:
			this.triang_seq.reload = (this.triang_seq.reload & 0xFF00) | data;
			break;
			
		case 0x400B:
			if (this.triang_cnt.enable) this.triang_cnt.counter = this.length_lookup[(data & 0xF8) >> 3];			
			this.triang_lnc.reload_flag = 1;
			
			this.triang_seq.reload = (data & 0x07) << 8 | (this.triang_seq.reload & 0x00FF);
			break;
			
		case 0x400C:
			this.pnoise_env.loop = (data >> 5) & 0x1;
			this.pnoise_cnt.halt = (data >> 5) & 0x1;
			
			this.pnoise_env.constant = (data >> 4) & 0x1;
			
			this.pnoise_env.reload = data & 0x0F;
			break;
			
		case 0x400E:
			this.pnoise_lfs.reload = this.pnoise_lookup[this.mode][data & 0xF];
			this.pnoise_lfs.mode = data >> 7;
			break;
			
		case 0x400F:
			if (this.pnoise_cnt.enable) this.pnoise_cnt.counter = this.length_lookup[(data & 0xF8) >> 3];			
			this.pnoise_env.start = 1;
			break;
			
		case 0x4010:
			this.dmc_seq.reload = this.dpcmrt_lookup[this.mode][data & 0x0F];
			this.dmc_loop = (data & 0x40);
			this.dmc_irq_enable = (data & 0x80);
			break;
			
		case 0x4011:
			this.dmc_seq.output = data & 0x7F;
			break;
			
		case 0x4012:
			this.dmc_sample_address = (0xC000 | (data << 6))
			break;
			
		case 0x4013:
			this.dmc_sample_length = (0x01 | (data << 4))
			break;
			
		case 0x4015:
			this.pulse1_cnt.enable = (data >> 0) & 0x01;
			this.pulse2_cnt.enable = (data >> 1) & 0x01;
			this.triang_cnt.enable = (data >> 2) & 0x01;
			this.pnoise_cnt.enable = (data >> 3) & 0x01;
			
			this.pulse1_cnt.counter *= (data >> 0) & 0x01;
			this.pulse2_cnt.counter *= (data >> 1) & 0x01;
			this.triang_cnt.counter *= (data >> 2) & 0x01;
			this.pnoise_cnt.counter *= (data >> 3) & 0x01;
			
			if ((data >> 4) & 0x01) {
				if (!this.dmc_sample_remain) {
					this.dmc_sample_counter = this.dmc_sample_address;
					this.dmc_sample_remain = this.dmc_sample_length;
				}
			} else {
				this.dmc_sample_remain = 0;
			}
			
			this.dmc_irq_flag = false;
			break;
			
		case 0x4017:
			this.seq_mode = data >> 7;
			this.irq_inhb = (data >> 6) & 0x1;
			this.mirqWroteTo = true;
			this.resetWait = 3;
			this.temp = 1;
			break;
		}
	}
	
	cpuRead(addr, readOnly) {
		let data = 0x00;
		
		if (addr === 0x4015) {
			data = this.dmc_irq_flag << 7 | this.irq_flag << 6 | ((this.dmc_sample_remain > 0) << 4) | ((this.pnoise_cnt.counter > 0) << 3) |  ((this.triang_cnt.counter > 0) << 2) | ((this.pulse2_cnt.counter > 0) << 1) | (this.pulse1_cnt.counter > 0);
			
			if (!readOnly) {
				this.irq_flag = false;
			}
		}
		
		return data;
	}
	
	clock() {
		let quarterFrameClock = false;
		let halfFrameClock = false;
		
		this.globalTime += (0.3333333333 / 1789773);
		
		if (this.clock_counter % 3 === 0) {
			if (!(this.cpu_clock_counter & 1)) {
				this.frame_clock_counter++;
				
				if (this.mirqWroteTo) {
					this.mirqWroteTo = false;
					this.temp = 1;
				}
				
				if (this.seq_mode) {
					if (this.frame_clock_counter === 3729) {
						quarterFrameClock = true;
					}
					
					if (this.frame_clock_counter === 7457) {
						quarterFrameClock = true;
						halfFrameClock = true;
					}
					
					if (this.frame_clock_counter === 11186) {
						quarterFrameClock = true;
					}
					
					if (this.frame_clock_counter === 18641) {
						quarterFrameClock = true;
						halfFrameClock = true;
						this.frame_clock_counter = 0;
					}
				} else {
					if (this.frame_clock_counter === 0) {
						this.irq_flag = this.irq_inhb ? false : true;
					}
					
					if (this.frame_clock_counter === 3729) {
						quarterFrameClock = true;
					}
					
					if (this.frame_clock_counter === 7457) {
						quarterFrameClock = true;
						halfFrameClock = true;
					}
					
					if (this.frame_clock_counter === 11186) {
						quarterFrameClock = true;
					}
					
					if (this.frame_clock_counter === 14914) {
						this.irq_flag = this.irq_inhb ? false : true;
					}
					
					if (this.frame_clock_counter === 14915) {
						quarterFrameClock = true;
						halfFrameClock = true;
						this.irq_flag = this.irq_inhb ? false : true;
						this.frame_clock_counter = 0;
					}
				}
				
				if (quarterFrameClock) {
					this.pulse1_env.clock();
					this.pulse2_env.clock();
					
					this.triang_lnc.clock();
					this.pnoise_env.clock();
				}
				
				if (halfFrameClock) {
					this.pulse1_cnt.clock();
					this.pulse1_swp.clock();
					this.pulse2_cnt.clock();
					this.pulse2_swp.clock();
					
					this.triang_cnt.clock();
					this.pnoise_cnt.clock();
				}
				
				this.pulse1_seq.clock(function(s) {
					s.output = (s.sequence & (0b10000000 >> s.seq_pos)) >> (7 - s.seq_pos);
					s.seq_pos -= 1;
					if (s.seq_pos === -1) s.seq_pos = 7;
				});
				
				if (this.pulse1_seq.output && !this.pulse1_swp.mute && this.pulse1_cnt.counter && this.pulse1_seq.reload > 7) {
					this.pulse1_sample = this.pulse1_env.constant ? this.pulse1_env.reload : this.pulse1_env.volume;
				} else {
					this.pulse1_sample = 0;
				}
				
				this.pulse2_seq.clock(function(s) {
					s.output = (s.sequence & (0b10000000 >> s.seq_pos)) >> (7 - s.seq_pos);
					s.seq_pos -= 1;
					if (s.seq_pos === -1) s.seq_pos = 7;
				});
				
				if (this.pulse2_seq.output && !this.pulse2_swp.mute && this.pulse2_cnt.counter && this.pulse2_seq.reload > 7) {
					this.pulse2_sample = this.pulse2_env.constant ? this.pulse2_env.reload : this.pulse2_env.volume;
				} else {
					this.pulse2_sample = 0;
				}
				
				this.pnoise_lfs.clock();
				
				if (!(this.pnoise_lfs.shift_register & 0x1) && this.pnoise_cnt.counter) {
					this.pnoise_sample = this.pnoise_env.constant ? this.pnoise_env.reload : this.pnoise_env.volume;
				} else {
					this.pnoise_sample = 0;
				}
			} else if (this.temp === 1) {
				this.temp = 0;
				this.frame_clock_counter = 0;
				
				this.pulse1_env.clock();
				this.pulse2_env.clock();
				
				this.triang_lnc.clock();
				this.pnoise_env.clock();
				this.pulse1_cnt.clock();
				this.pulse1_swp.clock();
				this.pulse2_cnt.clock();
				this.pulse2_swp.clock();
				
				this.triang_cnt.clock();
				this.pnoise_cnt.clock();
			}
			
			if (this.dmc_buffer_empty && this.dmc_sample_remain) {
				this.dmc_sample_buffer = 0x00;
				
				// the cpu should be stalled here
				
				this.dmc_sample_buffer = this.bus.cpuRead(this.dmc_sample_counter);
				this.dmc_sample_counter ++;
				if (this.dmc_sample_counter > 0xFFFF) this.dmc_sample_counter = 0x8000;
				this.dmc_sample_remain--;
				if (!this.dmc_sample_remain) {
					if (this.dmc_loop) {
						this.dmc_sample_counter = this.dmc_sample_address;
						this.dmc_sample_remain = this.dmc_sample_length;
					} else if (this.dmc_irq_enable) {
						this.dmc_irq_flag = true;
					}
				}
				
				this.dmc_buffer_empty = false;
			}
			
			let sb = this.dmc_sample_buffer;
			let be = this.dmc_buffer_empty;
			let buffer_emptied = false;
			
			this.dmc_seq.clock(function(s) {
				if (!s.silence) {
					if (s.shift_register & 0x01 && s.output <= 125) {
						s.output += 2
					} else if (s.output >= 2) {
						s.output -= 2
					}
				}
				
				s.shift_register >>= 1;
				s.bits_remaining -= 1;
				
				if (s.bits_remaining == 0) {
					s.bits_remaining = 8;
					if (be) {
						s.silence = true;
					} else {
						s.silence = false;
						s.shift_register = sb;
						buffer_emptied = true;
					}
				}
			});
			
			if (buffer_emptied) this.dmc_buffer_empty = true;
			
			this.dmc_sample = this.dmc_seq.output;
			
			if (this.triang_lnc.counter !== 0 && this.triang_cnt.counter !== 0) {
				this.triang_seq.clock(function(s) {
					if (s.new_seq === 0) {
						s.seq_pos--;
						if (s.seq_pos === -1) {
							s.seq_pos = 0;
							s.new_seq = 1;
						}
					} else {
						s.seq_pos++;
						if (s.seq_pos === 16) {
							s.seq_pos = 15;
							s.new_seq = 0;
						}
					}
				});
			}
			
			this.triang_sample = (this.triang_seq.reload < 2) ? 7.5 : this.triang_seq.seq_pos;
			
			this.temp = 0;
			this.cpu_clock_counter++;
		}
		
		this.clock_counter++;
	}
	
	reset() {
		this.triang_seq.new_seq = 1;
		this.triang_seq.seq_pos = 15;
		
		this.dmc_sample &= 0x1;
	}
	
	GetOutputSample() {
		let pulse_out = (95.98) / ((8128 / (this.pulse1_sample * this.volume[1] + this.pulse2_sample * this.volume[2])) + 100);
		let tnd_out = (159.79) / (((1) / ((this.triang_sample * this.volume[3] / 8227) + (this.pnoise_sample * this.volume[4] / 12241) + (this.dmc_sample * this.volume[5] / 22638))) + 100);
		
		return (pulse_out + tnd_out) * this.volume[0];
	}
	
	constructor() {
		this.pulse1_swp.channel = this.pulse1_seq;
		this.pulse1_swp.which = 1;
		
		this.pulse2_swp.channel = this.pulse2_seq;
		this.pulse2_swp.which = 0;
	}
	
	resetWait = -2;
	temp = 0;
	
	mode = 0;
	volume = [1, 1, 1, 1, 1, 1];
	
	pnoise_lookup = [[4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068]
									,[4, 8, 14, 30, 60, 88, 118, 148, 188, 236, 354, 472, 708,  944, 1890, 3778]];
	length_lookup = [10,254, 20,  2, 40,  4, 80,  6, 160,  8, 60, 10, 14, 12, 26, 14,
									 12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30];
	dpcmrt_lookup = [[428, 380, 340, 320, 286, 254, 226, 214, 190, 160, 142, 128, 106,  84,  72,  54],
									 [398, 354, 316, 298, 276, 236, 210, 198, 176, 148, 132, 118,  98,  78,  66,  50]]
	
	globalTime = 0;
	cpu_clock_counter = 0;
	
	
	irq_flag = false;
	mirqWroteTo = false;
	
	seq_mode = 0;
	irq_inhb = 0;
	
	clock_counter = 0;
	frame_clock_counter = 15;
	
	pulse1_seq = new sequencer();
	pulse1_env = new envelope();
	pulse1_swp = new sweeper();
	pulse1_cnt = new length_counter();
	pulse1_sample = 0;
	
	pulse2_seq = new sequencer();
	pulse2_env = new envelope();
	pulse2_swp = new sweeper();
	pulse2_cnt = new length_counter();
	pulse2_sample = 0;
	
	triang_seq = new sequencer();
	triang_lnc = new linear_counter();
	triang_cnt = new length_counter();
	triang_sample = 0;
	
	pnoise_lfs = new lfsr();
	pnoise_env = new envelope();
	pnoise_cnt = new length_counter();
	pnoise_sample = 0;
	
	dmc_seq = new dmc_unit();
	dmc_sample_buffer = 0x00;
	dmc_sample_address = 0x0000;
	dmc_sample_counter = 0x0000;
	dmc_sample_length = 0x0000;
	dmc_sample_remain = 0x0000;
	dmc_buffer_empty = true;
	dmc_irq_flag = false;
	dmc_irq_enable = false;
	dmc_loop = false;
	dmc_sample = 0;
	
	bus = null;
}