class Mapper_000 extends Mapper {
	cpuMapRead(addr, mapped_addr, data) {
		if (addr >= 0x8000 && addr <= 0xFFFF) {
			mapped_addr.v = addr & (this.PRGBanks > 1 ? 0x7FFF : 0x3FFF);
			return true;
		}
		
		return false;
	}
	
	cpuMapWrite(addr, mapped_addr, data) {
		if (addr >= 0x8000 && addr <= 0xFFFF) {
			mapped_addr.v = addr & (this.PRGBanks > 1 ? 0x7FFF : 0x3FFF);
			return true;
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
}
