let audioContext;// = new AudioContext({latencyHint: 50/1000, sampleRate: 44100/4});

let nesSoundEngine;
let soundReady = false;
let workletReady = false;

/*let biquadFilter1 = audioContext.createBiquadFilter();
biquadFilter1.type = "highpass";
biquadFilter1.frequency.value = 90;

let biquadFilter2 = audioContext.createBiquadFilter();
biquadFilter2.type = "highpass";
biquadFilter2.frequency.value = 440;

let biquadFilter3 = audioContext.createBiquadFilter();
biquadFilter3.type = "lowpass";
biquadFilter3.frequency.value = 14000;*/
let speed = 2;

let sab = new SharedArrayBuffer(513 * Float64Array.BYTES_PER_ELEMENT);
let buf = new Float64Array(sab);

function SoundOut() {
	return 0;
}

async function setupSound() {
	await audioContext.audioWorklet.addModule('./nes-sound-worklet.js');
	
	nesSoundEngine = new AudioWorkletNode(audioContext, 'nes-sound-engine', {numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1]});
	
	nesSoundEngine.port.postMessage({
      sab: sab
  });
	
	nesSoundEngine.port.onmessage = function(e) {
		for (let i = 0; i < 512; i++) {
			buf[i] = SoundOut();
		}
		
		buf[512] = 1;
	}
	
	/*setInterval(function() {
		if (buf[512] == 0) {
			for (let i = 0; i < 512; i++) {
				if (typeof(SoundOut) == 'function') {
					buf[i] = SoundOut();
				}
			}
			
			buf[512] = 1;
		}
	}, 1);*/
	
	nesSoundEngine.connect(audioContext.destination);//biquadFilter1);
	//biquadFilter1.connect(biquadFilter2);
	//biquadFilter2.connect(biquadFilter3);
	//biquadFilter3.connect(audioContext.destination);
	workletReady = true;
};

let contextStarted = false;

function startContext() {
	let autoResume = setInterval(function() {
		audioContext.resume();
		
		let soundReadyT = audioContext.state != "suspended";
		if (soundReadyT == true && !contextStarted) {
			contextStarted = true;
			setupSound();
		}
		
		if (workletReady) {
			soundReady = true;
			document.body.onunload = function() { buf[512] = 1; audioContext.close() }
			clearInterval(autoResume);
		}
	}, 1);
}