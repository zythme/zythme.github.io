let nesroms = {}

let romStorage = localStorage.getItem('roms');

function hexToBytes(hex) {
	let bytes = [];
	for (let i = 0; i < hex.length; i += 2) {
		bytes.push(parseInt(hex.substr(i, 2), 16));
	}
	return bytes;
}

function bytesToHex(bytes) {
	let hex = [];
	for (let i = 0; i < bytes.length; i++) {
		let current = bytes[i] & 0xFF;
		hex.push((current >>> 4).toString(16));
		hex.push((current & 0xF).toString(16));
	}
	return hex.join("");	
}

function strToBytes(str) {
	let bytes = [];
	for (let i = 0; i < str.length; i++) {
		let current = str.charCodeAt(i);
		bytes.push(current >>> 8);
		bytes.push(current & 0xFF);
	}
	return bytes;
}

function bytesToStr(bytes) {
	let str = '';
	if (bytes.length & 0x1) {
		bytes[bytes.length] = 0x00;
	}
	for (let i = 0; i < bytes.length; i += 2) {
		let current1 = bytes[i + 0] & 0xFF;
		let current2 = bytes[i + 1] & 0xFF;
		str += String.fromCharCode(current1 << 8 | current2);
	}
	return str;	
}

if (romStorage != null) {
	let romNames = romStorage.split('/');
	for (let i = 0; i < romNames.length - 1; i++) {
		nesroms[romNames[i]] = strToBytes(localStorage.getItem(romNames[i]));
	}
} else {
	romStorage = '';
}

nesroms["Select a file"] = [0];