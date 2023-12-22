class SoundEngine extends AudioWorkletProcessor {
	sab = new Float64Array(513 * Float64Array.BYTES_PER_ELEMENT);
	
	constructor (...args) {
    super(...args);
		let self = this;
		
		this.port.onmessage = (e) => {
			this.sab = new Float64Array(e.data.sab);
    }
	}
	
	counter = 0;
	
	process(_, outputs) {
		for (const output of outputs) {
			for (const channelData of output) {
				for (let i = 0; i < channelData.length; i += 1) {
					channelData[i] = this.sab[(i + (128 * this.counter))];
				}
			}
		}
		
		this.counter++;
		
		if (this.counter == 4) {
			this.port.postMessage({});
			while (this.sab[512] !== 1) {};
			this.sab[512] = 0;
			this.counter = 0;
		}
		
		return true;
	}
}

console.log(sampleRate)
	
registerProcessor('nes-sound-engine', SoundEngine);