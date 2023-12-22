const MIRROR = {
	HARDWARE: 0,
	HORIZONTAL: 1,
	VERTICAL: 2,
	ONESCREEN_LO: 3,
	ONESCREEN_HI: 4,
}	

class Mapper {
	PRGBanks = 0;
	CHRBanks = 0;
	
	constructor(prgBanks, chrBanks) {
		this.PRGBanks = prgBanks;
		this.CHRBanks = chrBanks;
		
		this.reset();
	}
	
	reset() {
		
	}
	
	mirror() {
		return MIRROR.HARDWARE;
	}
	
	irqState() {
		return false;
	}
	
	irqClear() {
		
	}
	
	scanline() {
		
	}
	
	soundClock() {
		
	}
	
	GetOutputSample() {
		return 0;
	}
}
