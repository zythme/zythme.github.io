class Mapper_007 extends Mapper {
	cpuMapRead(addr, mapped_addr, data) {
		if (addr >= 0x8000 && addr <= 0xFFFF) {
			mapped_addr.v = this.PRGBankSelect * 0x8000 + (addr & 0x7FFF);
			return true
		} else {
			return false;
		}
	}
	
	cpuMapWrite(addr, mapped_addr, data) {
		if (addr >= 0x8000 && addr <= 0xFFFF) {
			this.PRGBankSelect = data.v & 0x07;
			this.mirrormode = 3 + (data.v >> 4);
		}
		
		return false;
	}
	
	ppuMapRead(addr, mapped_addr) {
		return false;
	}
	
	ppuMapWrite(addr, mapped_addr) {
		return false;
	}
	
	reset() {
		this.PRGBankSelect = 0;
	}
	
	mirror() {
		return this.mirrormode;
	}
	
	mirrormode = 3;
	PRGBankSelect = 0x00;
}
