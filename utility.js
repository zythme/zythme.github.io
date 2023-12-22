let width = 256;
let height = 240;
let framerate = 1000;

let cnvs = document.createElement('canvas');
document.body.appendChild(cnvs);

cnvs.style.backgroundColor = '#000';

let ctx = cnvs.getContext('2d');

// graphics

class Color {
	constructor(r = 0, g = 0, b = 0, a = 255) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	}
}

let colors = {
	GREY: new Color(192, 192, 192), DARK_GREY: new Color(128, 128, 128), VERY_DARK_GREY: new Color(64, 64, 64),
	RED: new Color(255, 0, 0), DARK_RED: new Color(128, 0, 0), VERY_DARK_RED: new Color(64, 0, 0),
	YELLOW: new Color(255, 255, 0), DARK_YELLOW: new Color(128, 128, 0), VERY_DARK_YELLOW: new Color(64, 64, 0),
	GREEN: new Color(0, 255, 0), DARK_GREEN: new Color(0, 128, 0), VERY_DARK_GREEN: new Color(0, 64, 0),
	CYAN: new Color(0, 255, 255), DARK_CYAN: new Color(0, 128, 128), VERY_DARK_CYAN: new Color(0, 64, 64),
	BLUE: new Color(0, 0, 255), DARK_BLUE: new Color(0, 0, 128), VERY_DARK_BLUE: new Color(0, 0, 64),
	MAGENTA: new Color(255, 0, 255), DARK_MAGENTA: new Color(128, 0, 128), VERY_DARK_MAGENTA: new Color(64, 0, 64),
	WHITE: new Color(255, 255, 255), BLACK: new Color(0, 0, 0), BLANK: new Color(0, 0, 0, 0)
}

class Sprite {
	imgdata = null;
	
	buf = null;
	buf8 = null;
	data = null;
	
	constructor(width = 200, height = 50) {
		this.width = width;
		this.height = height;
		this.imgdata = new ImageData(width, height);
		
		this.buf = new ArrayBuffer(width * height * 4);
		this.buf8 = new Uint8ClampedArray(this.buf);
		this.data = new Uint32Array(this.buf);
	}
	
	UpdatePixels() {
		this.imgdata.data.set(this.buf8);
	}
	
	SetPixel(x, y, c, brightness = 1) {
		if (x < 0 || y < 0) return;
		if (x >= this.width || y >= this.height) return;
		this.data[y * this.width + x] = 
			(c.a << 24) |
			((c.b * brightness) << 16) |
			((c.g * brightness) <<  8) |
			 (c.r * brightness);
	}
	
	GetPixel(x, y) {
		let i = y * (this.width * 4) + x * 4;
		let c = new Color();
		c.r = this.buf8[i + 0];
		c.g = this.buf8[i + 1];
		c.b = this.buf8[i + 2];
		c.a = this.buf8[i + 3];
		return c;
	}
}

function scaleImageData(imageData, scale) {
  var scaled = ctx.createImageData(imageData.width * scale, imageData.height * scale);

  for(var row = 0; row < imageData.height; row++) {
    for(var col = 0; col < imageData.width; col++) {
      var sourcePixel = [
        imageData.data[(row * imageData.width + col) * 4 + 0],
        imageData.data[(row * imageData.width + col) * 4 + 1],
        imageData.data[(row * imageData.width + col) * 4 + 2],
        imageData.data[(row * imageData.width + col) * 4 + 3]
      ];
      for(var y = 0; y < scale; y++) {
        var destRow = row * scale + y;
        for(var x = 0; x < scale; x++) {
          var destCol = col * scale + x;
          for(var i = 0; i < 4; i++) {
            scaled.data[(destRow * scaled.width + destCol) * 4 + i] =
              sourcePixel[i];
          }
        }
      }
    }
  }

  return scaled;
}

function DrawSprite(x, y, sprite, scale = 1, autoUpdate = true) {
	if (scale != 1) {
		if (autoUpdate) sprite.UpdatePixels();
		ctx.putImageData(scaleImageData(sprite.imgdata, scale), x, y);
	} else {
		if (autoUpdate) sprite.UpdatePixels();
		ctx.putImageData(sprite.imgdata, x, y);
	}
}

function DrawPartialSprite(x, y, sprite, ox, oy, w, h, scale = 1) {
	if (scale != 1) {
		ctx.putImageData(scaleImageData(sprite.imgdata, scale), x, y, ox * scale, oy * scale, w * scale, h * scale);
	} else {
		ctx.putImageData(sprite.imgdata, x, y, ox, oy, w, h);
	}
}

function DrawString(x, y, text, c = colors.WHITE, scale = 1) {
	ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a/255})`;
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.font = 7 * scale + 'px nes';
  ctx.fillText(text, x, y);
}

function FillRect(x, y, w, h, c) {
	ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a/255})`;
	ctx.fillRect(x, y, w, h);
}

function DrawRect(x, y, w, h, c) {
	ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a/255})`;
	ctx.strokeRect(x, y, w, h);
}

function Clear(c) {
	FillRect(0, 0, width, height, c);
}

// input

let heldKeys = {};
let pressedKeys = {};

document.addEventListener('keydown', function(e) {
	heldKeys[e.key] = true;
	if (e.repeat) return;
	pressedKeys[e.key] = true;
});

document.addEventListener('keyup', function(e) {
	heldKeys[e.key] = false;
});

// main

let frameInterval;
let prevTime = Date.now();

let waitStart = setInterval(function() {
	if (typeof(start) == 'function') {
		let result = start();
		clearInterval(waitStart);
		
		cnvs.width = width;
		cnvs.height = height;
		
		if (!result) {
			alert("Failed to start!");
			return;
		}
		//prevTime = performance.now();
		frameInterval = setInterval(function() {
			//let currentTime = performance.now();
			//let elapsedTime = currentTime - prevTime;
			//prevTime = currentTime;
			if (typeof(update) == 'function') {
				update()
			}
			for (const key in pressedKeys) {
				pressedKeys[key] = false;
			}
		}, 1000/framerate);
	}
}, 1000/framerate);

function hex(n, d) {
	let s = '';
	for (let i = d - 1; i >= 0; i--, n >>=4) {
		s = ("0123456789ABCDEF")[n & 0xF] + s;
	}
	return s;
}

function uncomplement(val, bitwidth) {
    var isnegative = val & (1 << (bitwidth - 1));
    var boundary = (1 << bitwidth);
    var minval = -boundary;
    var mask = boundary - 1;
    return isnegative ? minval + (val & mask) : val;
}

Array.prototype.findNext = function(idx) {
	while (idx < this.length && idx >= 0) {
		if (this[idx] != undefined) {
			return idx;
		}
		idx++;
	}
	return this.length;
}

Array.prototype.findPrevious = function(idx) {
	while (idx < this.length && idx >= 0) {
		if (this[idx] != undefined) {
			return idx;
		}
		idx--;
	}
	return this.length;
}

function flipbyte(b) {
	b = (b & 0xF0) >> 4 | (b & 0x0F) << 4;
	b = (b & 0xCC) >> 2 | (b & 0x33) << 2;
	b = (b & 0xAA) >> 1 | (b & 0x55) << 1;
	return b;
}

function localStorageSpace() {
	var data = '';
	
	for (const key in localStorage){
		if (localStorage.hasOwnProperty(key)){
			data += localStorage[key];
			//console.log( key + " = " + ((window.localStorage[key].length * 16)/(8 * 1024)).toFixed(2) + ' KB' );
		}
	}
	
	return {used: ((data.length * 16)/8), left: (5242880 - ((data.length * 16)/8))};
};

let debug = false;
let debugName = 'bad_apple_2.nes';
const debugHex = ''
let debugRom = new Uint8Array(debugHex.length);

for (let i = 0; i < debugHex.length; i++) {
   debugRom[i] = parseInt(debugHex[i], 16);
}

if (debug) {
	window.onerror = function(errorMsg, url, lineNumber){
		alert("Error in " + url + " at " + lineNumber + ":\n" + errorMsg);
	}
	
	var originalConsoleWarn = console.warn;
	console.warn = function(message) {
		alert(message);
		originalConsoleWarn(message);
	};
}