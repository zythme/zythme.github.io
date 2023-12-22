class Mapper_003 extends Mapper {
	cpuMapRead(addr, mapped_addr, data) {
		if (addr >= 0x8000 && addr <= 0xFFFF) {
			if (this.PRGBanks == 1) {
				mapped_addr.v = addr & 0x3FFF;
			}
			if (this.PRGBanks == 2) {
				mapped_addr.v = addr & 0x7FFF;
			}
			return true
		} else {
			return false;
		}
	}
	
	cpuMapWrite(addr, mapped_addr, data) {
		if (addr >= 0x8000 && addr <= 0xFFFF) {
			this.CHRBankSelect = data.v & 0x03;
			mapped_addr.v = addr;
		}
		
		return false;
	}
	
	ppuMapRead(addr, mapped_addr) {
		if (addr < 0x2000) {
			mapped_addr.v = this.CHRBankSelect * 0x2000 + addr;
			return true;
		}
		
		return false;
	}
	
	ppuMapWrite(addr, mapped_addr) {
		return false;
	}
	
	reset() {
		this.CHRBankSelect = 0;
	}
	
	CHRBankSelect = 0x00;
}
