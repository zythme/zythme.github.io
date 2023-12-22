class Mapper_002 extends Mapper {
	cpuMapRead(addr, mapped_addr, data) {
		if (addr >= 0x8000 && addr <= 0xBFFF) {
			mapped_addr.v = this.PRGBankSelectLo * 0x4000 + (addr & 0x3FFF);
			return true;
		}
		
		if (addr >= 0xC000 && addr <= 0xFFFF) {
			mapped_addr.v = this.PRGBankSelectHi * 0x4000 + (addr & 0x3FFF);
			return true;
		}
		
		return false;
	}
	
	cpuMapWrite(addr, mapped_addr, data) {
		if (addr >= 0x8000 && addr <= 0xFFFF) {
			this.PRGBankSelectLo = data.v & 0x0F;
		}
		
		return false;
	}
	
	ppuMapRead(addr, mapped_addr) {
		if (addr < 0x2000) {
			mapped_addr.v = addr;
			return true;
		} else {
			return false;
		}
	}
	
	ppuMapWrite(addr, mapped_addr) {
		if (addr < 0x2000) {
			if (this.CHRBanks == 0) {
				mapped_addr.v = addr;
				return true;
			}
		}
		
		return false;
	}
	
	reset() {
		this.PRGBankSelectLo = 0;
		this.PRGBankSelectHi = this.PRGBanks - 1;
	}
	
	PRGBankSelectLo = 0x00;
	PRGBankSelectHi = 0x00;
}
