class Bus {
	cpu = new nes6502();
	ppu = new nes2C02();
	apu = new nes2A03();
	
	cart = null;
	nsfMode = false;
	
	cpuRam = new Uint8Array(2048);
	
	controller = new Uint8Array(2);
	controller_state = new Uint8Array(2);
	
	systemClockCounter = 0;
	
	dma_page = 0x00;
	dma_addr = 0x00;
	dma_data = 0x00;
	
	dma_dummy = true;
	dma_transfer = false;
	
	data = new uint8();
	mode = 0;
	
	SetSampleFrequency(sample_rate) {
		this.audioTimePerSystemSample = 1000 / sample_rate;
		this.audioTimePerNESClock = 1000 / (this.mode ? 4987821 : 5369318);
	}
	
	switchMode(s) {
		this.mode = !this.mode ? 1 : 0;
		this.ppu.mode = this.mode;
		this.apu.mode = this.mode;
		this.SetSampleFrequency(s);
	}
	
	audioSample = 0;
	audioTime = 0;
	
	audioTimePerSystemSample = 0;
	audioTimePerNESClock = 0;
	
	nsfPlaySpeed = 0;
	nsfTimer = 0;
	
	constructor() {		
		this.cpu.ConnectBus(this);
		this.apu.bus = this;
		
		this.apu.cpuWrite(0x4017, 0x00);
		this.apu.cpuWrite(0x4015, 0x00);
		
		this.apu.cpuWrite(0x4000, 0x00);
		this.apu.cpuWrite(0x4001, 0x00);
		this.apu.cpuWrite(0x4002, 0x00);
		this.apu.cpuWrite(0x4003, 0x00);
		this.apu.cpuWrite(0x4004, 0x00);
		this.apu.cpuWrite(0x4005, 0x00);
		this.apu.cpuWrite(0x4006, 0x00);
		this.apu.cpuWrite(0x4007, 0x00);
		this.apu.cpuWrite(0x4008, 0x00);
		this.apu.cpuWrite(0x4009, 0x00);
		this.apu.cpuWrite(0x400A, 0x00);
		this.apu.cpuWrite(0x400B, 0x00);
		this.apu.cpuWrite(0x400C, 0x00);
		this.apu.cpuWrite(0x400D, 0x00);
		this.apu.cpuWrite(0x400E, 0x00);
		this.apu.cpuWrite(0x400F, 0x00);
		
		this.apu.cpuWrite(0x4010, 0x00);
		this.apu.cpuWrite(0x4011, 0x00);
		this.apu.cpuWrite(0x4012, 0x00);
		this.apu.cpuWrite(0x4013, 0x00);
	}
	
	cpuWrite(addr, data) {
		this.data.v = data;
		addr &= 0xFFFF;
		if (this.cart.cpuWrite(addr, this.data)) {
			
		} else if (addr >= 0x0000 && addr <= 0x1FFF) {
			this.cpuRam[addr & 0x07FF] = this.data.v;
		} else if (addr >= 0x2000 && addr <= 0x3FFF) {
			this.ppu.cpuWrite(addr & 0x0007, this.data.v);
		} else if ((addr >= 0x4000 && addr <= 0x4013) || addr === 0x4015 || addr === 0x4017) {
			this.apu.cpuWrite(addr, data);
		} else if (addr === 0x4014) {
			this.dma_page = this.data.v;
			this.dma_addr = 0x00;
			this.dma_transfer = true;
		} else if (addr >= 0x4016 && addr <= 0x4017) {
			this.controller_state[addr & 0x0001] = this.controller[addr & 0x0001];
		}
	}
	
	cpuRead(addr, readOnly = false) {
		let temp = this.data.v;
		this.data.v = 0;
		addr &= 0xFFFF;
		if (this.cart.cpuRead(addr, this.data)) {
			
		} else if (addr >= 0x0000 && addr <= 0x1FFF) {
			this.data.v = this.cpuRam[addr & 0x07FF];
		} else if (addr >= 0x2000 && addr <= 0x3FFF) {
			this.data.v = this.ppu.cpuRead(addr & 0x0007, readOnly);
		} else if (addr === 0x4015) {
			this.data.v = this.apu.cpuRead(addr, readOnly, temp);
		} else if (addr >= 0x4016 && addr <= 0x4017) {
			this.data.v = (this.controller_state[addr & 0x0001] & 0x80) > 0;
			this.controller_state[addr & 0x0001] <<= 1;
		} else {
			this.data.v = temp;
		}
		
		return this.data.v;
	}
	
	insertCartridge(cartridge) {
		this.cart = cartridge;
		this.ppu.ConnectCartridge(cartridge);
	}
	
	reset() {
		this.cart.reset();
		this.cpu.reset();
		this.ppu.reset();
		this.apu.reset();
		this.cpuWrite(0x4015, 0x00);
		this.systemClockCounter = 0;
		this.dma_page = 0x00;
		this.dma_addr = 0x00;
		this.dma_data = 0x00;
		this.dma_dummy = true;
		this.dma_transfer = false;
	}
	
	NSFPlay() {
		if (!this.cpu.doneWithSubroutine) return;
		this.cpu.addr_abs = cart.playaddr;
		this.cpu.JSR();
	}
	
	clock() {
		if (!this.nsfMode) this.ppu.clock();
		
		this.apu.clock();
		this.cart.mapper.soundClock();
		
		if (this.systemClockCounter % 3 === 0) {
			if (this.dma_transfer) {
				if (this.dma_dummy) {
					if (this.systemClockCounter & 1) {
						this.dma_dummy = false;
					}
				} else {
					if (!(this.systemClockCounter & 1)) {
						this.dma_data = this.cpuRead(this.dma_page << 8 | this.dma_addr);
					} else {
						this.ppu.pOAM(this.dma_addr, this.dma_data);
						this.dma_addr++;
						
						if (this.dma_addr === 0x100) {
							this.dma_transfer = false;
							this.dma_dummy = true;
						}
					}
				}
			} else {
				if (nes.cpu.pc > 0x0500 || this.nsfMode == false) this.cpu.clock();
			}
		}
		
		let audioSampleReady = false;
		this.audioTime += this.audioTimePerNESClock;
		if (this.audioTime >= this.audioTimePerSystemSample) {
			this.audioTime -= this.audioTimePerSystemSample;
			this.audioSample = this.apu.GetOutputSample() + this.cart.mapper.GetOutputSample();
			audioSampleReady = true;
		}
		
		if (this.apu.irq_flag || this.apu.dmc_irq_flag) {
			this.apu.irq_flag = false;
			if (!this.nsfMode) this.cpu.irq();
		}
		
		if (this.ppu.nmi) {
			this.ppu.nmi = false;
			this.cpu.nmi();
		}
		
		if (this.cart.GetMapper().irqState()) {
			this.cart.GetMapper().irqClear();
			this.cpu.irq();
		}
		
		if (this.nsfMode) {
			this.nsfTimer += this.audioTimePerNESClock;
			if (this.nsfTimer >= this.nsfPlaySpeed / 1000) {
				this.nsfTimer -= this.nsfPlaySpeed / 1000;
				this.NSFPlay();
			}
		}
		
		this.systemClockCounter++;
		return audioSampleReady;
	}
}