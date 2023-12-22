class Mapper_031 extends Mapper {
	cpuMapRead(addr, mapped_addr, data) {
		if (addr >= 0x8000 && addr <= 0xFFFF) {
			mapped_addr.v = this.registers[(addr & 0x7000) >> 12] << 12 | addr & 0x0FFF;
			return true;
		}
		
		return false;
	}
	
	cpuMapWrite(addr, mapped_addr, data) {
		if (addr >= 0x5000 && addr <= 0x5FFF) {
			this.registers[addr & 0x07] = data.v & this.PRGMask;
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
		this.registers = new Uint8Array(8);
		this.PRGMask = ((this.PRGBanks * 16384) >> 12) - 1;
		this.registers[7] = 0xFF & this.PRGMask;
	}
	
	registers = new Uint8Array(8);
	PRGSize = 0;
}
