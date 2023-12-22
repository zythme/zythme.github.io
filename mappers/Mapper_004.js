class Mapper_004 extends Mapper {
	cpuMapRead(addr, mapped_addr, data) {
		if (addr >= 0x6000 && addr <= 0x7FFF) {
			mapped_addr.v = 0xFFFFFFFF;
			
			data.v = this.RAMStatic[addr & 0x1FFF];
			
			return true;
		}
		
		if (addr >= 0x8000 && addr <= 0x9FFF) {
			mapped_addr.v = this.PRGBank[0] + (addr & 0x1FFF);
			return true;
		}
		
		if (addr >= 0xA000 && addr <= 0xBFFF) {
			mapped_addr.v = this.PRGBank[1] + (addr & 0x1FFF);
			return true;
		}
		
		if (addr >= 0xC000 && addr <= 0xDFFF) {
			mapped_addr.v = this.PRGBank[2] + (addr & 0x1FFF);
			return true;
		}
		
		if (addr >= 0xE000 && addr <= 0xFFFF) {
			mapped_addr.v = this.PRGBank[3] + (addr & 0x1FFF);
			return true;
		}
		
		return false;
	}
	
	cpuMapWrite(addr, mapped_addr, data) {
		if (addr >= 0x6000 && addr <= 0x7FFF) {
			mapped_addr.v = 0xFFFFFFFF;
			
			this.RAMStatic[addr & 0x1FFF] = data.v;
			
			return true;
		}
		
		if (addr >= 0x8000 && addr <= 0x9FFF) {
			if (!(addr & 0x0001)) {
				this.TargetRegister = data.v & 0x07;
				this.PRGBankMode = (data.v & 0x40);
				this.CHRInversion = (data.v & 0x80);
			} else {
				this.Register[this.TargetRegister] = data.v;
				
				if (this.CHRInversion) {
					this.CHRBank[0] = this.Register[2] * 0x0400;
					this.CHRBank[1] = this.Register[3] * 0x0400;
					this.CHRBank[2] = this.Register[4] * 0x0400;
					this.CHRBank[3] = this.Register[5] * 0x0400;
					this.CHRBank[4] = (this.Register[0] & 0xFE) * 0x0400;
					this.CHRBank[5] = this.Register[0] * 0x0400 + 0x0400;
					this.CHRBank[6] = (this.Register[1] & 0xFE) * 0x0400;
					this.CHRBank[7] = this.Register[1] * 0x0400 + 0x0400;
				} else {
					this.CHRBank[0] = (this.Register[0] & 0xFE) * 0x0400;
					this.CHRBank[1] = this.Register[0] * 0x0400 + 0x0400;
					this.CHRBank[2] = (this.Register[1] & 0xFE) * 0x0400;
					this.CHRBank[3] = this.Register[1] * 0x0400 + 0x0400;
					this.CHRBank[4] = this.Register[2] * 0x0400;
					this.CHRBank[5] = this.Register[3] * 0x0400;
					this.CHRBank[6] = this.Register[4] * 0x0400;
					this.CHRBank[7] = this.Register[5] * 0x0400;
				}
				
				if (this.PRGBankMode) {
					this.PRGBank[2] = (this.Register[6] & 0x3F) * 0x2000;
					this.PRGBank[0] = (this.PRGBanks * 2 - 2) * 0x2000;
				} else {
					this.PRGBank[0] = (this.Register[6] & 0x3F) * 0x2000;
					this.PRGBank[2] = (this.PRGBanks * 2 - 2) * 0x2000;
				}
				
				this.PRGBank[1] = (this.Register[7] & 0x3F) * 0x2000;
				this.PRGBank[3] = (this.PRGBanks * 2 - 1) * 0x2000;
			}
			
			return false
		}
		
		if (addr >= 0xA000 && addr <= 0xBFFF) {
			if (!(addr & 0x0001)) {
				if (data.v & 0x01) {
					this.mirrormode = MIRROR.HORIZONTAL;
				} else {
					this.mirrormode = MIRROR.VERTICAL;
				}
			} else {
				
			}
			return false;
		}
		
		
		if (addr >= 0xC000 && addr <= 0xDFFF) {
			if (!(addr & 0x0001)) {
				this.IRQReload = data.v;
			} else {
				this.IRQCounter = 0x0000;
			}
			
			return false;
		}
		
		if (addr >= 0xE000 && addr <= 0xFFFF) {
			if (!(addr & 0x0001)) {
				this.IRQEnable = false;
				this.IRQActive = false;
			} else {
				this.IRQEnable = true;
			}
			
			return false;
		}
		
		return false;
	}
	
	ppuMapRead(addr, mapped_addr) {
		if (addr >= 0x0000 && addr <= 0x03FF) {
			mapped_addr.v = this.CHRBank[0] + (addr & 0x03FF);
			return true;
		}
		
		if (addr >= 0x0400 && addr <= 0x07FF) {
			mapped_addr.v = this.CHRBank[1] + (addr & 0x03FF);
			return true;
		}
		
		if (addr >= 0x0800 && addr <= 0x0BFF) {
			mapped_addr.v = this.CHRBank[2] + (addr & 0x03FF);
			return true;
		}
		
		if (addr >= 0x0C00 && addr <= 0x0FFF) {
			mapped_addr.v = this.CHRBank[3] + (addr & 0x03FF);
			return true;
		}
		
		if (addr >= 0x1000 && addr <= 0x13FF) {
			mapped_addr.v = this.CHRBank[4] + (addr & 0x03FF);
			return true;
		}
		
		if (addr >= 0x1400 && addr <= 0x17FF) {
			mapped_addr.v = this.CHRBank[5] + (addr & 0x03FF);
			return true;
		}
		
		if (addr >= 0x1800 && addr <= 0x1BFF) {
			mapped_addr.v = this.CHRBank[6] + (addr & 0x03FF);
			return true;
		}
		
		if (addr >= 0x1C00 && addr <= 0x1FFF) {
			mapped_addr.v = this.CHRBank[7] + (addr & 0x03FF);
			return true;
		}
		
		return false;
	}
	
	ppuMapWrite(addr, mapped_addr) {
		return false;
	}
	
	constructor(prgBanks, chrBanks) {
		super(prgBanks, chrBanks);
		this.RAMStatic = new Uint8Array(32 * 1024);
	}
	
	reset() {
		this.TargetRegister = 0x00;
		this.PRGBankMode = false;
		this.CHRInversion = false;
		this.mirrormode = MIRROR.HORIZONTAL;
		
		this.IRQActive = false;
		this.IRQEnable = false;
		this.IRQUpdate = false;
		this.IRQCounter = 0x0000;
		this.IRQReload = 0x0000;
		
		this.Register = new Array(8);
		this.CHRBank = new Array(8);
		this.PRGBank = new Array(4);
		
		for (let i = 0; i < 4; i++) this.PRGBank[i] = 0;
		for (let i = 0; i < 8; i++) { this.CHRBank[i] = 0; this.Register[i] = 0; }
    
		this.PRGBank[0] = 0 * 0x2000;
		this.PRGBank[1] = 1 * 0x2000;
		this.PRGBank[2] = (this.PRGBanks * 2 - 2) * 0x2000;
		this.PRGBank[3] = (this.PRGBanks * 2 - 1) * 0x2000;
	}
	
	mirror() {
		return this.mirrormode;
	}
	
	irqState() {
		return this.IRQActive;
	}
	
	irqClear() {
		this.IRQActive = false;
	}
	
	scanline() {
		if (this.IRQCounter == 0) {
			this.IRQCounter = this.IRQReload;
		} else {
			this.IRQCounter--;
		}
		
		if (this.IRQCounter == 0 && this.IRQEnable) {
			this.IRQActive = true;
		}
	}
	
	TargetRegister = 0x00;
	PRGBankMode = false;
	CHRInversion = false;
	mirrormode = MIRROR.HORIZONTAL;
	
	Register = new Array(8);
	CHRBank = new Array(8);
	PRGBank = new Array(4);
	
	IRQActive = false;
	IRQEnable = false;
	IRQUpdate = false;
	IRQCounter = 0x0000;
	IRQReload = 0x0000;
	
	RAMStatic = new Uint8Array();
}
