class Mapper_001 extends Mapper {
	cpuMapRead(addr, mapped_addr, data) {
		if (addr >= 0x6000 && addr <= 0x7FFF) {
			mapped_addr.v = 0xFFFFFFFF;
			
			data.v = this.RAMStatic[addr & 0x1FFF];
			
			return true;
		}
		
		if (addr >= 0x8000) {
			if (this.ControlRegister & 0b01000) {
				if (addr >= 0x8000 && addr <= 0xBFFF) {
					mapped_addr.v = this.PRGBankSelect16Lo * 0x4000 + (addr & 0x3FFF);
					return true;
				}
				
				if (addr >= 0xC000 && addr <= 0xFFFF) {
					mapped_addr.v = this.PRGBankSelect16Hi * 0x4000 + (addr & 0x3FFF);
					return true;
				}
			} else {
				mapped_addr.v = this.PRGBankSelect32 * 0x8000 + (addr & 0x7FFF);
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
		
		if (addr >= 0x8000) {
			if (data.v & 0x80) {
				this.LoadRegister = 0x00;
				this.LoadRegisterCount = 0;
				this.ControlRegister = this.ControlRegister | 0x0C;
			} else {
				this.LoadRegister >>= 1;
				this.LoadRegister |= (data.v & 0x01) << 4;
				this.LoadRegisterCount++;
				
				if (this.LoadRegisterCount == 5) {
					let TargetRegister = (addr >> 13) & 0x03;
					
					if (TargetRegister == 0) {
						this.ControlRegister = this.LoadRegister & 0x1F;
						
						switch (this.ControlRegister & 0x03) {
						case 0: this.mirrormode = MIRROR.ONESCREEN_LO; break;
						case 1: this.mirrormode = MIRROR.ONESCREEN_HI; break;
						case 2: this.mirrormode = MIRROR.VERTICAL;     break;
						case 3: this.mirrormode = MIRROR.HORIZONTAL;   break;
						}
					} else if (TargetRegister == 1) {
						if (this.ControlRegister & 0b10000) {
							this.CHRBankSelect4Lo = this.LoadRegister & 0x1F;
						} else {
							this.CHRBankSelect8 = this.LoadRegister & 0x1E;
						}
					} else if (TargetRegister == 2) {
						if (this.ControlRegister & 0b10000) {
							this.CHRBankSelect4Hi = this.LoadRegister & 0x1F;
						}
					} else if (TargetRegister == 3) {
						let PRGMode = (this.ControlRegister >> 2) & 0x03;
						
						if (PRGMode == 0 || PRGMode == 1) {
							this.PRGBankSelect32 = (this.LoadRegister & 0x0E) >> 1;
						} else if (PRGMode == 2) {
							this.PRGBankSelect16Lo = 0;
							
							this.PRGBankSelect16Hi = this.LoadRegister & 0x0F;
						} else if (PRGMode == 3) {
							this.PRGBankSelect16Lo = this.LoadRegister & 0x0F;
							
							this.PRGBankSelect16Hi = this.PRGBanks - 1;
						}
					}
					
					this.LoadRegister = 0x00;
					this.LoadRegisterCount = 0;
				}
			}
		}
		
		return false;
	}
	
	ppuMapRead(addr, mapped_addr) {
		if (addr < 0x2000) {
			if (this.CHRBanks == 0) {
				mapped_addr.v = addr;
				return true;
			} else {
				if (this.ControlRegister & 0b10000) {
					if (addr >= 0x0000 && addr <= 0x0FFF) {
						mapped_addr.v = this.CHRBankSelect4Lo * 0x1000 + (addr & 0x0FFF);
						return true;
					}
					
					if (addr >= 0x1000 && addr <= 0x1FFF) {
						mapped_addr.v = this.CHRBankSelect4Hi * 0x1000 + (addr & 0x0FFF);
						return true;
					}
				} else {
					mapped_addr.v = this.CHRBankSelect8 * 0x1000 + (addr & 0x1FFF);
					return true;
				}
			}
		}
		
		return false;
	}
	
	ppuMapWrite(addr, mapped_addr) {
		if (addr < 0x2000) {
			if (this.CHRBanks == 0) {
				mapped_addr.v = addr;
				return true;
			}
			
			return true;
		}
		
		return false;
	}
	
	constructor(prgBanks, chrBanks) {
		super(prgBanks, chrBanks);
		this.RAMStatic = new Uint8Array(32 * 1024);
	}
	
	reset() {
		this.ControlRegister = 0x1C;
		this.LoadRegister = 0x00;
		this.LoadRegisterCount = 0x00;
		
		this.CHRBankSelect4Lo = 0;
		this.CHRBankSelect4Hi = 0;
		this.CHRBankSelect8 = 0;
		
		this.PRGBankSelect32 = 0;
		this.PRGBankSelect16Lo = 0;
		this.PRGBankSelect16Hi = this.PRGBanks - 1;
	}
	
	mirror() {
		return this.mirrormode;
	}
	
	CHRBankSelect4Lo = 0x00;
	CHRBankSelect4Hi = 0x00;
	CHRBankSelect8 = 0x00;
	
	PRGBankSelect16Lo = 0x00;
	PRGBankSelect16Hi = 0x00;
	PRGBankSelect32 = 0x00;
	
	LoadRegister = 0x00;
	LoadRegisterCount = 0x00;
	ControlRegister = 0x00;
	
	mirrormode = MIRROR.HORIZONTAL;
	RAMStatic = new Uint8Array();
}
