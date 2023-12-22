class INSTRUCTION {
	constructor(n, o, a, c) {
		this.name = n;
		this.operate = o;
		this.addrmode = a;
		this.cycles = c;
	}
}

const FLAGS6502 = {
	C: (1 << 0),
	Z: (1 << 1),
	I: (1 << 2),
	D: (1 << 3),
	B: (1 << 4),
	U: (1 << 5),
	V: (1 << 6),
	N: (1 << 7),
};

class nes6502 {
	a = 0x00;
	x = 0x00;
	y = 0x00;
	stkp = 0xFD;
	pc = 0x0000;
	//status = 0x34;
	
	get status() {
		return (this.C << 0) | (this.Z << 1) | (this.I << 2) | (this.D << 3) | (this.B << 4) | (this.U << 5) | (this.V << 6) | (this.N << 7)
	}
	
	set status(data) {
		this.C = (data >> 0) & 0x01;
		this.Z = (data >> 1) & 0x01;
		this.I = (data >> 2) & 0x01;
		this.D = (data >> 3) & 0x01;
		this.B = (data >> 4) & 0x01;
		this.U = (data >> 5) & 0x01;
		this.V = (data >> 6) & 0x01;
		this.N = (data >> 7) & 0x01;
	}
	
	C = 0
	Z = 0
	I = 1
	D = 0
	B = 1
	U = 1
	V = 0
	N = 0
	
	bus = null;
	fetched = 0x00;
	addr_abs = 0x0000;
	addr_rel = 0x0000;
	opcode = 0x00;
	cycles = 0x00;
	
	doneWithSubroutine = true;
	
	ConnectBus(n) {
		this.bus = n;
	}
	
	read(a) {
		return this.bus.cpuRead(a, false);
	}
	
	write(a, d) {
		this.bus.cpuWrite(a, d);
	}
	
	GetFlag(f) {
		return (this.status & f) ? 1 : 0;
	}
	
	SetFlag(f, v) {
		if (v) {
			this.status |= f;
		} else {
			this.status &= (~f) & 0xFF;
		}
	}
	
	clock() {
		if (this.cycles === 0) {
			this.opcode = this.read(this.pc);
			
			this.U = 1;
			
			this.pc = (this.pc + 1) & 0xFFFF;
			
			//this.cycles = this.lookup_cycles[this.opcode];
			
			let additionalCycle1;// = this[this.lookup_addrmode[this.opcode]]();
			
			let additionalCycle2;// = this[this.lookup_operate[this.opcode]]();
			
			switch(this.opcode) {
				case 0x00:
				this.cycles = 7;
				additionalCycle1 = this.IMM();
				additionalCycle2 = this.BRK();
				break;

				case 0x01:
				this.cycles = 6;
				additionalCycle1 = this.IZX();
				additionalCycle2 = this.ORA();
				break;

				case 0x02:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x03:
				this.cycles = 8;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x04:
				this.cycles = 3;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x05:
				this.cycles = 3;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.ORA();
				break;

				case 0x06:
				this.cycles = 5;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.ASL();
				break;

				case 0x07:
				this.cycles = 5;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x08:
				this.cycles = 3;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.PHP();
				break;

				case 0x09:
				this.cycles = 2;
				additionalCycle1 = this.IMM();
				additionalCycle2 = this.ORA();
				break;

				case 0x0A:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.ASL();
				break;

				case 0x0B:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x0C:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x0D:
				this.cycles = 4;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.ORA();
				break;

				case 0x0E:
				this.cycles = 6;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.ASL();
				break;

				case 0x0F:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x10:
				this.cycles = 2;
				additionalCycle1 = this.REL();
				additionalCycle2 = this.BPL();
				break;

				case 0x11:
				this.cycles = 5;
				additionalCycle1 = this.IZY();
				additionalCycle2 = this.ORA();
				break;

				case 0x12:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x13:
				this.cycles = 8;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x14:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x15:
				this.cycles = 4;
				additionalCycle1 = this.ZPX();
				additionalCycle2 = this.ORA();
				break;

				case 0x16:
				this.cycles = 6;
				additionalCycle1 = this.ZPX();
				additionalCycle2 = this.ASL();
				break;

				case 0x17:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x18:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.CLC();
				break;

				case 0x19:
				this.cycles = 4;
				additionalCycle1 = this.ABY();
				additionalCycle2 = this.ORA();
				break;

				case 0x1A:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x1B:
				this.cycles = 7;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x1C:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x1D:
				this.cycles = 4;
				additionalCycle1 = this.ABX();
				additionalCycle2 = this.ORA();
				break;

				case 0x1E:
				this.cycles = 7;
				additionalCycle1 = this.ABX();
				additionalCycle2 = this.ASL();
				break;

				case 0x1F:
				this.cycles = 7;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x20:
				this.cycles = 6;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.JSR();
				break;

				case 0x21:
				this.cycles = 6;
				additionalCycle1 = this.IZX();
				additionalCycle2 = this.AND();
				break;

				case 0x22:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x23:
				this.cycles = 8;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x24:
				this.cycles = 3;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.BIT();
				break;

				case 0x25:
				this.cycles = 3;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.AND();
				break;

				case 0x26:
				this.cycles = 5;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.ROL();
				break;

				case 0x27:
				this.cycles = 5;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x28:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.PLP();
				break;

				case 0x29:
				this.cycles = 2;
				additionalCycle1 = this.IMM();
				additionalCycle2 = this.AND();
				break;

				case 0x2A:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.ROL();
				break;

				case 0x2B:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x2C:
				this.cycles = 4;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.BIT();
				break;

				case 0x2D:
				this.cycles = 4;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.AND();
				break;

				case 0x2E:
				this.cycles = 6;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.ROL();
				break;

				case 0x2F:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x30:
				this.cycles = 2;
				additionalCycle1 = this.REL();
				additionalCycle2 = this.BMI();
				break;

				case 0x31:
				this.cycles = 5;
				additionalCycle1 = this.IZY();
				additionalCycle2 = this.AND();
				break;

				case 0x32:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x33:
				this.cycles = 8;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x34:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x35:
				this.cycles = 4;
				additionalCycle1 = this.ZPX();
				additionalCycle2 = this.AND();
				break;

				case 0x36:
				this.cycles = 6;
				additionalCycle1 = this.ZPX();
				additionalCycle2 = this.ROL();
				break;

				case 0x37:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x38:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.SEC();
				break;

				case 0x39:
				this.cycles = 4;
				additionalCycle1 = this.ABY();
				additionalCycle2 = this.AND();
				break;

				case 0x3A:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x3B:
				this.cycles = 7;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x3C:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x3D:
				this.cycles = 4;
				additionalCycle1 = this.ABX();
				additionalCycle2 = this.AND();
				break;

				case 0x3E:
				this.cycles = 7;
				additionalCycle1 = this.ABX();
				additionalCycle2 = this.ROL();
				break;

				case 0x3F:
				this.cycles = 7;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x40:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.RTI();
				break;

				case 0x41:
				this.cycles = 6;
				additionalCycle1 = this.IZX();
				additionalCycle2 = this.EOR();
				break;

				case 0x42:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x43:
				this.cycles = 8;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x44:
				this.cycles = 3;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x45:
				this.cycles = 3;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.EOR();
				break;

				case 0x46:
				this.cycles = 5;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.LSR();
				break;

				case 0x47:
				this.cycles = 5;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x48:
				this.cycles = 3;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.PHA();
				break;

				case 0x49:
				this.cycles = 2;
				additionalCycle1 = this.IMM();
				additionalCycle2 = this.EOR();
				break;

				case 0x4A:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.LSR();
				break;

				case 0x4B:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x4C:
				this.cycles = 3;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.JMP();
				break;

				case 0x4D:
				this.cycles = 4;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.EOR();
				break;

				case 0x4E:
				this.cycles = 6;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.LSR();
				break;

				case 0x4F:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x50:
				this.cycles = 2;
				additionalCycle1 = this.REL();
				additionalCycle2 = this.BVC();
				break;

				case 0x51:
				this.cycles = 5;
				additionalCycle1 = this.IZY();
				additionalCycle2 = this.EOR();
				break;

				case 0x52:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x53:
				this.cycles = 8;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x54:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x55:
				this.cycles = 4;
				additionalCycle1 = this.ZPX();
				additionalCycle2 = this.EOR();
				break;

				case 0x56:
				this.cycles = 6;
				additionalCycle1 = this.ZPX();
				additionalCycle2 = this.LSR();
				break;

				case 0x57:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x58:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.CLI();
				break;

				case 0x59:
				this.cycles = 4;
				additionalCycle1 = this.ABY();
				additionalCycle2 = this.EOR();
				break;

				case 0x5A:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x5B:
				this.cycles = 7;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x5C:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x5D:
				this.cycles = 4;
				additionalCycle1 = this.ABX();
				additionalCycle2 = this.EOR();
				break;

				case 0x5E:
				this.cycles = 7;
				additionalCycle1 = this.ABX();
				additionalCycle2 = this.LSR();
				break;

				case 0x5F:
				this.cycles = 7;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x60:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.RTS();
				break;

				case 0x61:
				this.cycles = 6;
				additionalCycle1 = this.IZX();
				additionalCycle2 = this.ADC();
				break;

				case 0x62:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x63:
				this.cycles = 8;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x64:
				this.cycles = 3;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x65:
				this.cycles = 3;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.ADC();
				break;

				case 0x66:
				this.cycles = 5;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.ROR();
				break;

				case 0x67:
				this.cycles = 5;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x68:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.PLA();
				break;

				case 0x69:
				this.cycles = 2;
				additionalCycle1 = this.IMM();
				additionalCycle2 = this.ADC();
				break;

				case 0x6A:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.ROR();
				break;

				case 0x6B:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x6C:
				this.cycles = 5;
				additionalCycle1 = this.IND();
				additionalCycle2 = this.JMP();
				break;

				case 0x6D:
				this.cycles = 4;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.ADC();
				break;

				case 0x6E:
				this.cycles = 6;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.ROR();
				break;

				case 0x6F:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x70:
				this.cycles = 2;
				additionalCycle1 = this.REL();
				additionalCycle2 = this.BVS();
				break;

				case 0x71:
				this.cycles = 5;
				additionalCycle1 = this.IZY();
				additionalCycle2 = this.ADC();
				break;

				case 0x72:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x73:
				this.cycles = 8;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x74:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x75:
				this.cycles = 4;
				additionalCycle1 = this.ZPX();
				additionalCycle2 = this.ADC();
				break;

				case 0x76:
				this.cycles = 6;
				additionalCycle1 = this.ZPX();
				additionalCycle2 = this.ROR();
				break;

				case 0x77:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x78:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.SEI();
				break;

				case 0x79:
				this.cycles = 4;
				additionalCycle1 = this.ABY();
				additionalCycle2 = this.ADC();
				break;

				case 0x7A:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x7B:
				this.cycles = 7;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x7C:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x7D:
				this.cycles = 4;
				additionalCycle1 = this.ABX();
				additionalCycle2 = this.ADC();
				break;

				case 0x7E:
				this.cycles = 7;
				additionalCycle1 = this.ABX();
				additionalCycle2 = this.ROR();
				break;

				case 0x7F:
				this.cycles = 7;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x80:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x81:
				this.cycles = 6;
				additionalCycle1 = this.IZX();
				additionalCycle2 = this.STA();
				break;

				case 0x82:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x83:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x84:
				this.cycles = 3;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.STY();
				break;

				case 0x85:
				this.cycles = 3;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.STA();
				break;

				case 0x86:
				this.cycles = 3;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.STX();
				break;

				case 0x87:
				this.cycles = 3;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x88:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.DEY();
				break;

				case 0x89:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x8A:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.TXA();
				break;

				case 0x8B:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x8C:
				this.cycles = 4;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.STY();
				break;

				case 0x8D:
				this.cycles = 4;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.STA();
				break;

				case 0x8E:
				this.cycles = 4;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.STX();
				break;

				case 0x8F:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x90:
				this.cycles = 2;
				additionalCycle1 = this.REL();
				additionalCycle2 = this.BCC();
				break;

				case 0x91:
				this.cycles = 6;
				additionalCycle1 = this.IZY();
				additionalCycle2 = this.STA();
				break;

				case 0x92:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x93:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x94:
				this.cycles = 4;
				additionalCycle1 = this.ZPX();
				additionalCycle2 = this.STY();
				break;

				case 0x95:
				this.cycles = 4;
				additionalCycle1 = this.ZPX();
				additionalCycle2 = this.STA();
				break;

				case 0x96:
				this.cycles = 4;
				additionalCycle1 = this.ZPY();
				additionalCycle2 = this.STX();
				break;

				case 0x97:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x98:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.TYA();
				break;

				case 0x99:
				this.cycles = 5;
				additionalCycle1 = this.ABY();
				additionalCycle2 = this.STA();
				break;

				case 0x9A:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.TXS();
				break;

				case 0x9B:
				this.cycles = 5;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x9C:
				this.cycles = 5;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0x9D:
				this.cycles = 5;
				additionalCycle1 = this.ABX();
				additionalCycle2 = this.STA();
				break;

				case 0x9E:
				this.cycles = 5;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0x9F:
				this.cycles = 5;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xA0:
				this.cycles = 2;
				additionalCycle1 = this.IMM();
				additionalCycle2 = this.LDY();
				break;

				case 0xA1:
				this.cycles = 6;
				additionalCycle1 = this.IZX();
				additionalCycle2 = this.LDA();
				break;

				case 0xA2:
				this.cycles = 2;
				additionalCycle1 = this.IMM();
				additionalCycle2 = this.LDX();
				break;

				case 0xA3:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xA4:
				this.cycles = 3;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.LDY();
				break;

				case 0xA5:
				this.cycles = 3;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.LDA();
				break;

				case 0xA6:
				this.cycles = 3;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.LDX();
				break;

				case 0xA7:
				this.cycles = 3;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xA8:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.TAY();
				break;

				case 0xA9:
				this.cycles = 2;
				additionalCycle1 = this.IMM();
				additionalCycle2 = this.LDA();
				break;

				case 0xAA:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.TAX();
				break;

				case 0xAB:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xAC:
				this.cycles = 4;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.LDY();
				break;

				case 0xAD:
				this.cycles = 4;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.LDA();
				break;

				case 0xAE:
				this.cycles = 4;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.LDX();
				break;

				case 0xAF:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xB0:
				this.cycles = 2;
				additionalCycle1 = this.REL();
				additionalCycle2 = this.BCS();
				break;

				case 0xB1:
				this.cycles = 5;
				additionalCycle1 = this.IZY();
				additionalCycle2 = this.LDA();
				break;

				case 0xB2:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xB3:
				this.cycles = 5;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xB4:
				this.cycles = 4;
				additionalCycle1 = this.ZPX();
				additionalCycle2 = this.LDY();
				break;

				case 0xB5:
				this.cycles = 4;
				additionalCycle1 = this.ZPX();
				additionalCycle2 = this.LDA();
				break;

				case 0xB6:
				this.cycles = 4;
				additionalCycle1 = this.ZPY();
				additionalCycle2 = this.LDX();
				break;

				case 0xB7:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xB8:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.CLV();
				break;

				case 0xB9:
				this.cycles = 4;
				additionalCycle1 = this.ABY();
				additionalCycle2 = this.LDA();
				break;

				case 0xBA:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.TSX();
				break;

				case 0xBB:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xBC:
				this.cycles = 4;
				additionalCycle1 = this.ABX();
				additionalCycle2 = this.LDY();
				break;

				case 0xBD:
				this.cycles = 4;
				additionalCycle1 = this.ABX();
				additionalCycle2 = this.LDA();
				break;

				case 0xBE:
				this.cycles = 4;
				additionalCycle1 = this.ABY();
				additionalCycle2 = this.LDX();
				break;

				case 0xBF:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xC0:
				this.cycles = 2;
				additionalCycle1 = this.IMM();
				additionalCycle2 = this.CPY();
				break;

				case 0xC1:
				this.cycles = 6;
				additionalCycle1 = this.IZX();
				additionalCycle2 = this.CMP();
				break;

				case 0xC2:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0xC3:
				this.cycles = 8;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xC4:
				this.cycles = 3;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.CPY();
				break;

				case 0xC5:
				this.cycles = 3;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.CMP();
				break;

				case 0xC6:
				this.cycles = 5;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.DEC();
				break;

				case 0xC7:
				this.cycles = 5;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xC8:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.INY();
				break;

				case 0xC9:
				this.cycles = 2;
				additionalCycle1 = this.IMM();
				additionalCycle2 = this.CMP();
				break;

				case 0xCA:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.DEX();
				break;

				case 0xCB:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xCC:
				this.cycles = 4;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.CPY();
				break;

				case 0xCD:
				this.cycles = 4;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.CMP();
				break;

				case 0xCE:
				this.cycles = 6;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.DEC();
				break;

				case 0xCF:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xD0:
				this.cycles = 2;
				additionalCycle1 = this.REL();
				additionalCycle2 = this.BNE();
				break;

				case 0xD1:
				this.cycles = 5;
				additionalCycle1 = this.IZY();
				additionalCycle2 = this.CMP();
				break;

				case 0xD2:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xD3:
				this.cycles = 8;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xD4:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0xD5:
				this.cycles = 4;
				additionalCycle1 = this.ZPX();
				additionalCycle2 = this.CMP();
				break;

				case 0xD6:
				this.cycles = 6;
				additionalCycle1 = this.ZPX();
				additionalCycle2 = this.DEC();
				break;

				case 0xD7:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xD8:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.CLD();
				break;

				case 0xD9:
				this.cycles = 4;
				additionalCycle1 = this.ABY();
				additionalCycle2 = this.CMP();
				break;

				case 0xDA:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0xDB:
				this.cycles = 7;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xDC:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0xDD:
				this.cycles = 4;
				additionalCycle1 = this.ABX();
				additionalCycle2 = this.CMP();
				break;

				case 0xDE:
				this.cycles = 7;
				additionalCycle1 = this.ABX();
				additionalCycle2 = this.DEC();
				break;

				case 0xDF:
				this.cycles = 7;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xE0:
				this.cycles = 2;
				additionalCycle1 = this.IMM();
				additionalCycle2 = this.CPX();
				break;

				case 0xE1:
				this.cycles = 6;
				additionalCycle1 = this.IZX();
				additionalCycle2 = this.SBC();
				break;

				case 0xE2:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0xE3:
				this.cycles = 8;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xE4:
				this.cycles = 3;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.CPX();
				break;

				case 0xE5:
				this.cycles = 3;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.SBC();
				break;

				case 0xE6:
				this.cycles = 5;
				additionalCycle1 = this.ZP0();
				additionalCycle2 = this.INC();
				break;

				case 0xE7:
				this.cycles = 5;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xE8:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.INX();
				break;

				case 0xE9:
				this.cycles = 2;
				additionalCycle1 = this.IMM();
				additionalCycle2 = this.SBC();
				break;

				case 0xEA:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0xEB:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.SBC();
				break;

				case 0xEC:
				this.cycles = 4;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.CPX();
				break;

				case 0xED:
				this.cycles = 4;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.SBC();
				break;

				case 0xEE:
				this.cycles = 6;
				additionalCycle1 = this.ABS();
				additionalCycle2 = this.INC();
				break;

				case 0xEF:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xF0:
				this.cycles = 2;
				additionalCycle1 = this.REL();
				additionalCycle2 = this.BEQ();
				break;

				case 0xF1:
				this.cycles = 5;
				additionalCycle1 = this.IZY();
				additionalCycle2 = this.SBC();
				break;

				case 0xF2:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xF3:
				this.cycles = 8;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xF4:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0xF5:
				this.cycles = 4;
				additionalCycle1 = this.ZPX();
				additionalCycle2 = this.SBC();
				break;

				case 0xF6:
				this.cycles = 6;
				additionalCycle1 = this.ZPX();
				additionalCycle2 = this.INC();
				break;

				case 0xF7:
				this.cycles = 6;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xF8:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.SED();
				break;

				case 0xF9:
				this.cycles = 4;
				additionalCycle1 = this.ABY();
				additionalCycle2 = this.SBC();
				break;

				case 0xFA:
				this.cycles = 2;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0xFB:
				this.cycles = 7;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;

				case 0xFC:
				this.cycles = 4;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.NOP();
				break;

				case 0xFD:
				this.cycles = 4;
				additionalCycle1 = this.ABX();
				additionalCycle2 = this.SBC();
				break;

				case 0xFE:
				this.cycles = 7;
				additionalCycle1 = this.ABX();
				additionalCycle2 = this.INC();
				break;

				case 0xFF:
				this.cycles = 7;
				additionalCycle1 = this.IMP();
				additionalCycle2 = this.XXX();
				break;
			}
			
			this.cycles += (additionalCycle1 & additionalCycle2);
			
			this.U = 1;
		}
		
		this.cycles--;
	}
	
	reset() {
		this.stkp -= 3;
		this.status |= 0x04;
		
		this.addr_abs = 0xFFFC;
		let lo = this.read(this.addr_abs + 0);
		let hi = this.read(this.addr_abs + 1);
		
		this.pc = (hi << 8) | lo;
		
		this.addr_rel = 0x0000;
		this.addr_abs = 0x0000;
		this.fetched = 0x00;
		
		this.cycles = 8;
	}
	
	irq() {
		if (!this.I) {
			this.doneWithSubroutine = true;
			this.write(0x0100 + this.stkp, (this.pc >> 8) & 0x00FF);
			this.stkp = (this.stkp - 1) & 0xFF;
			this.write(0x0100 + this.stkp, this.pc & 0x00FF);
			this.stkp = (this.stkp - 1) & 0xFF;
			
			this.B = 0;
			this.U = 1;
			this.I = 1;
			this.write(0x0100 + this.stkp, this.status);
			this.stkp = (this.stkp - 1) & 0xFF;
			
			this.addr_abs = 0xFFFE;
			let lo = this.read(this.addr_abs + 0);
			let hi = this.read(this.addr_abs + 1);
			this.pc = (hi << 8) | lo;
			
			this.cycles = 7;
		}
	}
	
	nmi() {
		this.write(0x0100 + this.stkp, (this.pc >> 8) & 0x00FF);
		this.stkp = (this.stkp - 1) & 0xFF;
		this.write(0x0100 + this.stkp, this.pc & 0x00FF);
		this.stkp = (this.stkp - 1) & 0xFF;
		
		this.B = 0;
		this.U = 1;
		this.I = 1;
		this.write(0x0100 + this.stkp, this.status);
		this.stkp = (this.stkp - 1) & 0xFF;
		
		this.addr_abs = 0xFFFA;
		let lo = this.read(this.addr_abs + 0);
		let hi = this.read(this.addr_abs + 1);
		this.pc = (hi << 8) | lo;
		
		this.cycles = 8;
	}
	
	fetch() {
		if (!(this.lookup_addrmode[this.opcode] === "IMP")) {
			this.fetched = this.read(this.addr_abs);
		}
		return this.fetched;
	}
	
	IMP() {
		this.fetched = this.a;
		return 0;
	}
	
	IMM() {
		this.addr_abs = this.pc;
		this.pc = (this.pc + 1) & 0xFFFF;
		return 0;
	}
	
	ZP0() {
		this.addr_abs = this.read(this.pc);
		this.pc = (this.pc + 1) & 0xFFFF;
		this.addr_abs &= 0x00FF;
		return 0;
	}
	
	ZPX() {
		this.addr_abs = (this.read(this.pc) + this.x);
		this.pc = (this.pc + 1) & 0xFFFF;
		this.addr_abs &= 0x00FF;
		return 0;
	}
	
	ZPY() {
		this.addr_abs = (this.read(this.pc) + this.y);
		this.pc = (this.pc + 1) & 0xFFFF;
		this.addr_abs &= 0x00FF;
		return 0;
	}
	
	REL() {
		this.addr_rel = this.read(this.pc);
		this.pc = (this.pc + 1) & 0xFFFF;
		if (this.addr_rel & 0x80) {
			this.addr_rel |= 0xFF00;
		}
		return 0
	}
	
	ABS() {
		let lo = this.read(this.pc);
		this.pc = (this.pc + 1) & 0xFFFF;
		let hi = this.read(this.pc);
		this.pc = (this.pc + 1) & 0xFFFF;
		
		this.addr_abs = (hi << 8) | lo;
		
		return 0;
	}
	
	ABX() {
		let lo = this.read(this.pc);
		this.pc = (this.pc + 1) & 0xFFFF;
		let hi = this.read(this.pc);
		this.pc = (this.pc + 1) & 0xFFFF;
		
		this.addr_abs = (hi << 8) | lo;
		this.addr_abs = (this.addr_abs + this.x) & 0xFFFF;
		
		if ((this.addr_abs & 0xFF00) !== (hi << 8)) {
			return 1;
		} else {
			return 0;
		}
	}
	
	ABY() {
		let lo = this.read(this.pc);
		this.pc = (this.pc + 1) & 0xFFFF;
		let hi = this.read(this.pc);
		this.pc = (this.pc + 1) & 0xFFFF;
		
		this.addr_abs = (hi << 8) | lo;
		this.addr_abs = (this.addr_abs + this.y) & 0xFFFF;
		
		if ((this.addr_abs & 0xFF00) !== (hi << 8)) {
			return 1;
		} else {
			return 0;
		}
	}
	
	IND() {
		let ptr_lo = this.read(this.pc);
		this.pc = (this.pc + 1) & 0xFFFF;
		let ptr_hi = this.read(this.pc);
		this.pc = (this.pc + 1) & 0xFFFF;
		
		let ptr = (ptr_hi << 8) | ptr_lo;
		
		if (ptr_lo === 0x00FF) { // Simulate page boundary hardware bug
			this.addr_abs = (this.read(ptr & 0xFF00) << 8) | this.read(ptr + 0);
		} else {
			this.addr_abs = (this.read(ptr + 1) << 8) | this.read(ptr + 0);
		}
		
		return 0;
	}
	
	IZX() {
		let t = this.read(this.pc);
		this.pc = (this.pc + 1) & 0xFFFF;
		
		let lo = this.read((t + this.x) & 0x00FF);
		let hi = this.read((t + this.x + 1) & 0x00FF);
		
		this.addr_abs = (hi << 8) | lo;
		
		return 0;
	}
	
	IZY() {
		let t = this.read(this.pc);
		this.pc = (this.pc + 1) & 0xFFFF;
		
		let lo = this.read(t & 0x00FF);
		let hi = this.read((t + 1) & 0x00FF);
		
		this.addr_abs = (hi << 8) | lo;
		this.addr_abs = (this.addr_abs + this.y) & 0xFFFF;
		
		if ((this.addr_abs & 0xFF00) !== (hi << 8)) {
			return 1;
		} else {
			return 0;
		}
	}
	
	
	
	
	
	ADC() {
		this.fetch();
		
		let temp = this.a + this.fetched + this.C;
		
		this.C = (temp > 255);
		
		this.Z = ((temp & 0x00FF) === 0);
		
		this.V = ((~(this.a ^ this.fetched) & (this.a ^ temp)) & 0x0080) >> 7;
		
		this.N = (temp & 0x80) >> 7;
		
		this.a = temp & 0x00FF;
		
		return 1;
	}
	
	AND() {
		this.fetch();
		this.a = this.a & this.fetched;
		this.Z = this.a === 0x00;
		this.N = (this.a & 0x80) >> 7;
		return 1;
	}
	
	ASL() {
		this.fetch();
		let temp = this.fetched << 1;
		this.C = ((temp & 0xFF00) > 0);
		this.Z = ((temp & 0x00FF) === 0x00);
		this.N = (temp & 0x80) >> 7;
		if (this.lookup_addrmode[this.opcode] === "IMP") {
			this.a = temp & 0x00FF;
		} else {
			this.write(this.addr_abs, temp & 0x00FF);
		}
		return 0;
	}
	
	BCC() {
		if (!this.C) {
			this.cycles++;
			this.addr_abs = (this.pc + this.addr_rel) & 0xFFFF;
			
			if ((this.addr_abs & 0xFF00) !== (this.pc & 0xFF00)) {
				this.cycles++;
			}
			
			this.pc = this.addr_abs;
		}
		return 0;
	}
	
	BCS() {
		if (this.C) {
			this.cycles++;
			this.addr_abs = (this.pc + this.addr_rel) & 0xFFFF;
			
			if ((this.addr_abs & 0xFF00) !== (this.pc & 0xFF00)) {
				this.cycles++;
			}
			
			this.pc = this.addr_abs;
		}
		return 0;
	}
	
	BEQ() {
		if (this.Z) {
			this.cycles++;
			this.addr_abs = (this.pc + this.addr_rel) & 0xFFFF;
			
			if ((this.addr_abs & 0xFF00) !== (this.pc & 0xFF00)) {
				this.cycles++;
			}
			
			this.pc = this.addr_abs;
		}
		return 0;
	}
	
	BIT() {
		this.fetch();
		let temp = this.a & this.fetched;
		this.Z = ((temp & 0x00FF) === 0x00);
		this.N = (this.fetched & (1 << 7)) >> 7;
		this.V = (this.fetched & (1 << 6)) >> 6;
		return 0;
	}
	
	BMI() {
		if (this.N) {
			this.cycles++;
			this.addr_abs = (this.pc + this.addr_rel) & 0xFFFF;
			
			if ((this.addr_abs & 0xFF00) !== (this.pc & 0xFF00)) {
				this.cycles++;
			}
			
			this.pc = this.addr_abs;
		}
		return 0;
	}
	
	BNE() {
		if (!this.Z) {
			this.cycles++;
			this.addr_abs = (this.pc + this.addr_rel) & 0xFFFF;
			
			if ((this.addr_abs & 0xFF00) !== (this.pc & 0xFF00)) {
				this.cycles++;
			}
			
			this.pc = this.addr_abs;
		}
		return 0;
	}
	
	BPL() {
		if (!this.N) {
			this.cycles++;
			this.addr_abs = (this.pc + this.addr_rel) & 0xFFFF;
			
			if ((this.addr_abs & 0xFF00) !== (this.pc & 0xFF00)) {
				this.cycles++;
			}
			
			this.pc = this.addr_abs;
		}
		return 0;
	}
	
	BRK() {
		this.doneWithSubroutine = true;
		this.pc = (this.pc + 1) & 0xFFFF;
		
		this.I = 1;
		this.write(0x0100 + this.stkp, (this.pc >> 8) & 0x00FF);
		this.stkp = (this.stkp - 1) & 0xFF;
		this.write(0x0100 + this.stkp, this.pc & 0x00FF);
		this.stkp = (this.stkp - 1) & 0xFF;
		
		this.B = 1;
		this.write(0x0100 + this.stkp, this.status);
		this.stkp = (this.stkp - 1) & 0xFF;
		this.B = 0;
		
		this.pc = this.read(0xFFFE) | (this.read(0xFFFF) << 8);
		return 0;
	}
	
	BVC() {
		if (!this.V) {
			this.cycles++;
			this.addr_abs = (this.pc + this.addr_rel) & 0xFFFF;
			
			if ((this.addr_abs & 0xFF00) !== (this.pc & 0xFF00)) {
				this.cycles++;
			}
			
			this.pc = this.addr_abs;
		}
		return 0;
	}
	
	BVS() {
		if (this.V) {
			this.cycles++;
			this.addr_abs = (this.pc + this.addr_rel) & 0xFFFF;
			
			if ((this.addr_abs & 0xFF00) !== (this.pc & 0xFF00)) {
				this.cycles++;
			}
			
			this.pc = this.addr_abs;
		}
		return 0;
	}
	
	CLC() {
		this.C = false;
		return 0;
	}
	
	CLD() {
		this.D = false;
		return 0;
	}
	
	CLI() {
		this.I = false;
		return 0;
	}
	
	CLV() {
		this.V = false;
		return 0;
	}
	
	CMP() {
		this.fetch();
		let temp = this.a - this.fetched;
		this.C = (this.a >= this.fetched);
		this.Z = ((temp & 0x00FF) === 0x0000);
		this.N = (temp & 0x0080) >> 7;
		return 1;
	}
	
	CPX() {
		this.fetch();
		let temp = this.x - this.fetched;
		this.C = (this.x >= this.fetched);
		this.Z = ((temp & 0x00FF) === 0x0000);
		this.N = (temp & 0x0080) >> 7;
		return 0;
	}
	
	CPY() {
		this.fetch();
		let temp = this.y - this.fetched;
		this.C = (this.y >= this.fetched);
		this.Z = ((temp & 0x00FF) === 0x0000);
		this.N = (temp & 0x0080) >> 7;
		return 0;
	}
	
	DEC() {
		this.fetch();
		let temp = this.fetched - 1;
		this.write(this.addr_abs, temp & 0x00FF);
		this.Z = ((temp & 0x00FF) === 0x0000);
		this.N = (temp & 0x0080) >> 7;
		return 0;
	}
	
	DEX() {
		this.x = (this.x - 1) & 0xFF;
		this.Z = (this.x === 0x00);
		this.N = (this.x & 0x80) >> 7;
		return 0;
	}
	
	DEY() {
		this.y = (this.y - 1) & 0xFF;
		this.Z = (this.y === 0x00);
		this.N = (this.y & 0x80) >> 7;
		return 0;
	}
	
	EOR() {
		this.fetch();
		this.a = this.a ^ this.fetched;
		this.Z = (this.a === 0x00);
		this.N = (this.a & 0x80) >> 7;
		return 1;
	}
	
	INC() {
		this.fetch();
		let temp = this.fetched + 1;
		this.write(this.addr_abs, temp & 0x00FF);
		this.Z = ((temp & 0x00FF) === 0x0000);
		this.N = (temp & 0x0080) >> 7;
		return 0;
	}
	
	INX() {
		this.x = (this.x + 1) & 0xFF;
		this.Z = this.x === 0x00;
		this.N = (this.x & 0x80);
		return 0;
	}
	
	INY() {
		this.y = (this.y + 1) & 0xFF;
		this.Z = (this.y === 0x00);
		this.N = (this.y & 0x80) >> 7;
		return 0;
	}
	
	JMP() {
		this.pc = this.addr_abs;
		return 0;
	}
	
	JSR() {
		this.doneWithSubroutine = false;
		this.pc = (this.pc - 1) & 0xFFFF;
		
		this.write(0x0100 + this.stkp, (this.pc >> 8) & 0x00FF);
		this.stkp = (this.stkp - 1) & 0xFF;
		this.write(0x0100 + this.stkp, this.pc & 0x00FF);
		this.stkp = (this.stkp - 1) & 0xFF;
		
		this.pc = this.addr_abs;
		return 0;
	}
	
	LDA() {
		this.fetch();
		this.a = this.fetched;
		this.Z = this.a === 0x00;
		this.N = (this.a & 0x80) >> 7;
		return 1;
	}
	
	LDX() {
		this.fetch();
		this.x = this.fetched;
		this.Z = this.x === 0x00;
		this.N = (this.x & 0x80) >> 7;
		return 1;
	}
	
	LDY() {
		this.fetch();
		this.y = this.fetched;
		this.Z = this.y === 0x00;
		this.N = (this.y & 0x80) >> 7;
		return 1;
	}
	
	LSR() {
		this.fetch();
		this.C = (this.fetched & 0x0001);
		let temp = this.fetched >> 1;
		this.Z = ((temp & 0x00FF) === 0x0000);
		this.N = (temp & 0x0080) >> 7;
		if (this.lookup_addrmode[this.opcode] === "IMP") {
			this.a = temp & 0x00FF;
		} else {
			this.write(this.addr_abs, temp & 0x00FF);
		}
		return 0;
	}
	
	NOP() {
		switch(this.opcode) {
		case 0x1C:
		case 0x3C:
		case 0x5C:
		case 0x7C:
		case 0xDC:
		case 0xFC:
			return 1;
			break;
		}
		return 0;
	}
	
	ORA() {
		this.fetch();
		this.a = this.a | this.fetched;
		this.Z = (this.a === 0x00);
		this.N = (this.a & 0x80) >> 7;
		return 1;
	}
	
	PHA() {
		this.write(0x0100 + this.stkp, this.a);
		this.stkp = (this.stkp - 1) & 0xFF;
		return 0;
	}
	
	PHP() {
		this.write(0x0100 + this.stkp, this.status | FLAGS6502.B | FLAGS6502.U);
		this.B = 0;
		this.U = 0;
		this.stkp = (this.stkp - 1) & 0xFF;
		return 0;
	}
	
	PLA() {
		this.stkp = (this.stkp + 1) & 0xFF;
		this.a = this.read(0x0100 + this.stkp);
		this.Z = (this.a === 0x00);
		this.N = (this.a & 0x80) >> 7;
		return 0;
	}
	
	PLP() {
		this.stkp = (this.stkp + 1) & 0xFF;
		this.status = this.read(0x0100 + this.stkp);
		this.U = 1;
		return 0
	}
	
	ROL() {
		this.fetch();
		let temp = (this.fetched << 1) | this.C;
		this.C = (temp & 0xFF00) > 0;
		this.Z = ((temp & 0x00FF) === 0x0000);
		this.N = (temp & 0x0080) >> 7;
		if (this.lookup_addrmode[this.opcode] === "IMP") {
			this.a = temp & 0x00FF;
		} else {
			this.write(this.addr_abs, temp & 0x00FF);
		}
		return 0;
	}
	
	ROR() {
		this.fetch();
		let temp = (this.C << 7) | (this.fetched >> 1);
		this.C = (this.fetched & 0x01);
		this.Z = ((temp & 0x00FF) === 0x00);
		this.N = (temp & 0x0080) >> 7;
		if (this.lookup_addrmode[this.opcode] === "IMP") {
			this.a = temp & 0x00FF;
		} else {
			this.write(this.addr_abs, temp & 0x00FF);
		}
		return 0;
	}
	
	RTI() {
		this.stkp = (this.stkp + 1) & 0xFF;
		this.status = this.read(0x0100 + this.stkp);
		this.B = 0;
		this.U = 0;
		
		this.stkp = (this.stkp + 1) & 0xFF;
		this.pc = this.read(0x0100 + this.stkp);
		this.stkp = (this.stkp + 1) & 0xFF;
		this.pc |= this.read(0x0100 + this.stkp) << 8;
		return 0;
	}
	
	RTS() {
		this.doneWithSubroutine = true;
		this.stkp = (this.stkp + 1) & 0xFF;
		this.pc = this.read(0x0100 + this.stkp);
		this.stkp = (this.stkp + 1) & 0xFF;
		this.pc |= this.read(0x0100 + this.stkp) << 8;
		
		this.pc = (this.pc + 1) & 0xFFFF;
		return 0;
	}
	
	SBC() {
		this.fetch();
		
		let value = this.fetched ^ 0x00FF;
		
		let temp = this.a + value + this.C;
		
		this.C = (temp & 0xFF00) > 0;
		this.Z = ((temp & 0x00FF) === 0);
		this.V = ((temp ^ this.a) & (temp ^ value) & 0x0080) >> 7;
		this.N = (temp & 0x0080) >> 7;
		this.a = temp & 0x00FF;
		return 1;
	}
	
	SEC() {
		this.C = 1
		return 0;
	}
	
	SED() {
		this.D = 1
		return 0;
	}
	
	SEI() {
		this.I = 1
		return 0;
	}
	
	STA() {
		this.write(this.addr_abs, this.a);
		return 0;
	}
	
	STX() {
		this.write(this.addr_abs, this.x);
		return 0;
	}
	
	STY() {
		this.write(this.addr_abs, this.y);
		return 0;
	}
	
	TAX() {
		this.x = this.a;
		this.Z = this.x === 0x00;
		this.N = (this.x & 0x80) >> 7;
		return 0;
	}
	
	TAY() {
		this.y = this.a;
		this.Z = this.y === 0x00;
		this.N = (this.y & 0x80) >> 7;
		return 0;
	}
	
	TSX() {
		this.x = this.stkp;
		this.Z = this.x === 0x00;
		this.N = (this.x & 0x80) >> 7;
		return 0;
	}
	
	TXA() {
		this.a = this.x;
		this.Z = this.a === 0x00;
		this.N = (this.a & 0x80) >> 7;
		return 0;
	}
	
	TXS() {
		this.stkp = this.x;
		return 0;
	}
	
	TYA() {
		this.a = this.y;
		this.Z = this.a === 0x00;
		this.N = (this.a & 0x80) >> 7;
		return 0;
	}
	
	XXX() {
		return 0;
	}
	
	complete() {
		return this.cycles === 0;
	}
	
	disassemble(start, stop) {
		let addr = start;
		let value = 0x00, lo = 0x00, hi = 0x00;
		let mapLines = [];
		let line_addr = 0;
		
		while (addr <= stop) {
			let line_addr = addr;
			
			let sInst = "$" + hex(addr, 4) + ": ";
			
			let opcode = this.bus.cpuRead(addr, true); addr++;
			sInst += this.lookup[opcode].name + " ";
			
			if (this.lookup[opcode].addrmode === "IMP") {
				sInst += " {IMP}";
			} else if (this.lookup[opcode].addrmode === "IMM") {
				value = this.bus.cpuRead(addr, true); addr++;
				sInst += "#$" + hex(value, 2) + " {IMM}";
			} else if (this.lookup[opcode].addrmode === "ZP0") {
				lo = this.bus.cpuRead(addr, true); addr++;
				hi = 0x00;												
				sInst += "$" + hex(lo, 2) + " {ZP0}";
			} else if (this.lookup[opcode].addrmode === "ZPX") {
				lo = this.bus.cpuRead(addr, true); addr++;
				hi = 0x00;														
				sInst += "$" + hex(lo, 2) + ", X {ZPX}";
			} else if (this.lookup[opcode].addrmode === "ZPY") {
				lo = this.bus.cpuRead(addr, true); addr++;
				hi = 0x00;														
				sInst += "$" + hex(lo, 2) + ", Y {ZPY}";
			} else if (this.lookup[opcode].addrmode === "IZX") {
				lo = this.bus.cpuRead(addr, true); addr++;
				hi = 0x00;								
				sInst += "($" + hex(lo, 2) + ", X) {IZX}";
			} else if (this.lookup[opcode].addrmode === "IZY") {
				lo = this.bus.cpuRead(addr, true); addr++;
				hi = 0x00;								
				sInst += "($" + hex(lo, 2) + "), Y {IZY}";
			} else if (this.lookup[opcode].addrmode === "ABS") {
				lo = this.bus.cpuRead(addr, true); addr++;
				hi = this.bus.cpuRead(addr, true); addr++;
				sInst += "$" + hex((hi << 8) | lo, 4) + " {ABS}";
			} else if (this.lookup[opcode].addrmode === "ABX") {
				lo = this.bus.cpuRead(addr, true); addr++;
				hi = this.bus.cpuRead(addr, true); addr++;
				sInst += "$" + hex((hi << 8) | lo, 4) + ", X {ABX}";
			} else if (this.lookup[opcode].addrmode === "ABY") {
				lo = this.bus.cpuRead(addr, true); addr++;
				hi = this.bus.cpuRead(addr, true); addr++;
				sInst += "$" + hex((hi << 8) | lo, 4) + ", Y {ABY}";
			} else if (this.lookup[opcode].addrmode === "IND") {
				lo = this.bus.cpuRead(addr, true); addr++;
				hi = this.bus.cpuRead(addr, true); addr++;
				sInst += "($" + hex((hi << 8) | lo, 4) + ") {IND}";
			} else if (this.lookup[opcode].addrmode === "REL") {
				value = this.bus.cpuRead(addr, true); addr++;
				sInst += "$" + hex(value, 2) + " [$" + hex(addr + uncomplement(value & 0x00FF, 8), 4) + "] {REL}";
			}
			
			mapLines[line_addr] = sInst;
		}
		
		return mapLines;
	}
	
	constructor() {
		this.lookup = [
			new INSTRUCTION("BRK", "BRK", "IMM", 7), new INSTRUCTION("ORA", "ORA", "IZX", 6), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 8), new INSTRUCTION("???", "NOP", "IMP", 3), new INSTRUCTION("ORA", "ORA", "ZP0", 3), new INSTRUCTION("ASL", "ASL", "ZP0", 5), new INSTRUCTION("???", "XXX", "IMP", 5), new INSTRUCTION("PHP", "PHP", "IMP", 3), new INSTRUCTION("ORA", "ORA", "IMM", 2), new INSTRUCTION("ASL", "ASL", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("???", "NOP", "IMP", 4), new INSTRUCTION("ORA", "ORA", "ABS", 4), new INSTRUCTION("ASL", "ASL", "ABS", 6), new INSTRUCTION("???", "XXX", "IMP", 6), 
			new INSTRUCTION("BPL", "BPL", "REL", 2), new INSTRUCTION("ORA", "ORA", "IZY", 5), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 8), new INSTRUCTION("???", "NOP", "IMP", 4), new INSTRUCTION("ORA", "ORA", "ZPX", 4), new INSTRUCTION("ASL", "ASL", "ZPX", 6), new INSTRUCTION("???", "XXX", "IMP", 6), new INSTRUCTION("CLC", "CLC", "IMP", 2), new INSTRUCTION("ORA", "ORA", "ABY", 4), new INSTRUCTION("???", "NOP", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 7), new INSTRUCTION("???", "NOP", "IMP", 4), new INSTRUCTION("ORA", "ORA", "ABX", 4), new INSTRUCTION("ASL", "ASL", "ABX", 7), new INSTRUCTION("???", "XXX", "IMP", 7), 
			new INSTRUCTION("JSR", "JSR", "ABS", 6), new INSTRUCTION("AND", "AND", "IZX", 6), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 8), new INSTRUCTION("BIT", "BIT", "ZP0", 3), new INSTRUCTION("AND", "AND", "ZP0", 3), new INSTRUCTION("ROL", "ROL", "ZP0", 5), new INSTRUCTION("???", "XXX", "IMP", 5), new INSTRUCTION("PLP", "PLP", "IMP", 4), new INSTRUCTION("AND", "AND", "IMM", 2), new INSTRUCTION("ROL", "ROL", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("BIT", "BIT", "ABS", 4), new INSTRUCTION("AND", "AND", "ABS", 4), new INSTRUCTION("ROL", "ROL", "ABS", 6), new INSTRUCTION("???", "XXX", "IMP", 6), 
			new INSTRUCTION("BMI", "BMI", "REL", 2), new INSTRUCTION("AND", "AND", "IZY", 5), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 8), new INSTRUCTION("???", "NOP", "IMP", 4), new INSTRUCTION("AND", "AND", "ZPX", 4), new INSTRUCTION("ROL", "ROL", "ZPX", 6), new INSTRUCTION("???", "XXX", "IMP", 6), new INSTRUCTION("SEC", "SEC", "IMP", 2), new INSTRUCTION("AND", "AND", "ABY", 4), new INSTRUCTION("???", "NOP", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 7), new INSTRUCTION("???", "NOP", "IMP", 4), new INSTRUCTION("AND", "AND", "ABX", 4), new INSTRUCTION("ROL", "ROL", "ABX", 7), new INSTRUCTION("???", "XXX", "IMP", 7), 
			new INSTRUCTION("RTI", "RTI", "IMP", 6), new INSTRUCTION("EOR", "EOR", "IZX", 6), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 8), new INSTRUCTION("???", "NOP", "IMP", 3), new INSTRUCTION("EOR", "EOR", "ZP0", 3), new INSTRUCTION("LSR", "LSR", "ZP0", 5), new INSTRUCTION("???", "XXX", "IMP", 5), new INSTRUCTION("PHA", "PHA", "IMP", 3), new INSTRUCTION("EOR", "EOR", "IMM", 2), new INSTRUCTION("LSR", "LSR", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("JMP", "JMP", "ABS", 3), new INSTRUCTION("EOR", "EOR", "ABS", 4), new INSTRUCTION("LSR", "LSR", "ABS", 6), new INSTRUCTION("???", "XXX", "IMP", 6), 
			new INSTRUCTION("BVC", "BVC", "REL", 2), new INSTRUCTION("EOR", "EOR", "IZY", 5), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 8), new INSTRUCTION("???", "NOP", "IMP", 4), new INSTRUCTION("EOR", "EOR", "ZPX", 4), new INSTRUCTION("LSR", "LSR", "ZPX", 6), new INSTRUCTION("???", "XXX", "IMP", 6), new INSTRUCTION("CLI", "CLI", "IMP", 2), new INSTRUCTION("EOR", "EOR", "ABY", 4), new INSTRUCTION("???", "NOP", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 7), new INSTRUCTION("???", "NOP", "IMP", 4), new INSTRUCTION("EOR", "EOR", "ABX", 4), new INSTRUCTION("LSR", "LSR", "ABX", 7), new INSTRUCTION("???", "XXX", "IMP", 7), 
			new INSTRUCTION("RTS", "RTS", "IMP", 6), new INSTRUCTION("ADC", "ADC", "IZX", 6), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 8), new INSTRUCTION("???", "NOP", "IMP", 3), new INSTRUCTION("ADC", "ADC", "ZP0", 3), new INSTRUCTION("ROR", "ROR", "ZP0", 5), new INSTRUCTION("???", "XXX", "IMP", 5), new INSTRUCTION("PLA", "PLA", "IMP", 4), new INSTRUCTION("ADC", "ADC", "IMM", 2), new INSTRUCTION("ROR", "ROR", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("JMP", "JMP", "IND", 5), new INSTRUCTION("ADC", "ADC", "ABS", 4), new INSTRUCTION("ROR", "ROR", "ABS", 6), new INSTRUCTION("???", "XXX", "IMP", 6), 
			new INSTRUCTION("BVS", "BVS", "REL", 2), new INSTRUCTION("ADC", "ADC", "IZY", 5), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 8), new INSTRUCTION("???", "NOP", "IMP", 4), new INSTRUCTION("ADC", "ADC", "ZPX", 4), new INSTRUCTION("ROR", "ROR", "ZPX", 6), new INSTRUCTION("???", "XXX", "IMP", 6), new INSTRUCTION("SEI", "SEI", "IMP", 2), new INSTRUCTION("ADC", "ADC", "ABY", 4), new INSTRUCTION("???", "NOP", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 7), new INSTRUCTION("???", "NOP", "IMP", 4), new INSTRUCTION("ADC", "ADC", "ABX", 4), new INSTRUCTION("ROR", "ROR", "ABX", 7), new INSTRUCTION("???", "XXX", "IMP", 7), 
			new INSTRUCTION("???", "NOP", "IMP", 2), new INSTRUCTION("STA", "STA", "IZX", 6), new INSTRUCTION("???", "NOP", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 6), new INSTRUCTION("STY", "STY", "ZP0", 3), new INSTRUCTION("STA", "STA", "ZP0", 3), new INSTRUCTION("STX", "STX", "ZP0", 3), new INSTRUCTION("???", "XXX", "IMP", 3), new INSTRUCTION("DEY", "DEY", "IMP", 2), new INSTRUCTION("???", "NOP", "IMP", 2), new INSTRUCTION("TXA", "TXA", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("STY", "STY", "ABS", 4), new INSTRUCTION("STA", "STA", "ABS", 4), new INSTRUCTION("STX", "STX", "ABS", 4), new INSTRUCTION("???", "XXX", "IMP", 4), 
			new INSTRUCTION("BCC", "BCC", "REL", 2), new INSTRUCTION("STA", "STA", "IZY", 6), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 6), new INSTRUCTION("STY", "STY", "ZPX", 4), new INSTRUCTION("STA", "STA", "ZPX", 4), new INSTRUCTION("STX", "STX", "ZPY", 4), new INSTRUCTION("???", "XXX", "IMP", 4), new INSTRUCTION("TYA", "TYA", "IMP", 2), new INSTRUCTION("STA", "STA", "ABY", 5), new INSTRUCTION("TXS", "TXS", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 5), new INSTRUCTION("???", "NOP", "IMP", 5), new INSTRUCTION("STA", "STA", "ABX", 5), new INSTRUCTION("???", "XXX", "IMP", 5), new INSTRUCTION("???", "XXX", "IMP", 5), 
			new INSTRUCTION("LDY", "LDY", "IMM", 2), new INSTRUCTION("LDA", "LDA", "IZX", 6), new INSTRUCTION("LDX", "LDX", "IMM", 2), new INSTRUCTION("???", "XXX", "IMP", 6), new INSTRUCTION("LDY", "LDY", "ZP0", 3), new INSTRUCTION("LDA", "LDA", "ZP0", 3), new INSTRUCTION("LDX", "LDX", "ZP0", 3), new INSTRUCTION("???", "XXX", "IMP", 3), new INSTRUCTION("TAY", "TAY", "IMP", 2), new INSTRUCTION("LDA", "LDA", "IMM", 2), new INSTRUCTION("TAX", "TAX", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("LDY", "LDY", "ABS", 4), new INSTRUCTION("LDA", "LDA", "ABS", 4), new INSTRUCTION("LDX", "LDX", "ABS", 4), new INSTRUCTION("???", "XXX", "IMP", 4), 
			new INSTRUCTION("BCS", "BCS", "REL", 2), new INSTRUCTION("LDA", "LDA", "IZY", 5), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 5), new INSTRUCTION("LDY", "LDY", "ZPX", 4), new INSTRUCTION("LDA", "LDA", "ZPX", 4), new INSTRUCTION("LDX", "LDX", "ZPY", 4), new INSTRUCTION("???", "XXX", "IMP", 4), new INSTRUCTION("CLV", "CLV", "IMP", 2), new INSTRUCTION("LDA", "LDA", "ABY", 4), new INSTRUCTION("TSX", "TSX", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 4), new INSTRUCTION("LDY", "LDY", "ABX", 4), new INSTRUCTION("LDA", "LDA", "ABX", 4), new INSTRUCTION("LDX", "LDX", "ABY", 4), new INSTRUCTION("???", "XXX", "IMP", 4), 
			new INSTRUCTION("CPY", "CPY", "IMM", 2), new INSTRUCTION("CMP", "CMP", "IZX", 6), new INSTRUCTION("???", "NOP", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 8), new INSTRUCTION("CPY", "CPY", "ZP0", 3), new INSTRUCTION("CMP", "CMP", "ZP0", 3), new INSTRUCTION("DEC", "DEC", "ZP0", 5), new INSTRUCTION("???", "XXX", "IMP", 5), new INSTRUCTION("INY", "INY", "IMP", 2), new INSTRUCTION("CMP", "CMP", "IMM", 2), new INSTRUCTION("DEX", "DEX", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("CPY", "CPY", "ABS", 4), new INSTRUCTION("CMP", "CMP", "ABS", 4), new INSTRUCTION("DEC", "DEC", "ABS", 6), new INSTRUCTION("???", "XXX", "IMP", 6), 
			new INSTRUCTION("BNE", "BNE", "REL", 2), new INSTRUCTION("CMP", "CMP", "IZY", 5), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 8), new INSTRUCTION("???", "NOP", "IMP", 4), new INSTRUCTION("CMP", "CMP", "ZPX", 4), new INSTRUCTION("DEC", "DEC", "ZPX", 6), new INSTRUCTION("???", "XXX", "IMP", 6), new INSTRUCTION("CLD", "CLD", "IMP", 2), new INSTRUCTION("CMP", "CMP", "ABY", 4), new INSTRUCTION("NOP", "NOP", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 7), new INSTRUCTION("???", "NOP", "IMP", 4), new INSTRUCTION("CMP", "CMP", "ABX", 4), new INSTRUCTION("DEC", "DEC", "ABX", 7), new INSTRUCTION("???", "XXX", "IMP", 7), 
			new INSTRUCTION("CPX", "CPX", "IMM", 2), new INSTRUCTION("SBC", "SBC", "IZX", 6), new INSTRUCTION("???", "NOP", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 8), new INSTRUCTION("CPX", "CPX", "ZP0", 3), new INSTRUCTION("SBC", "SBC", "ZP0", 3), new INSTRUCTION("INC", "INC", "ZP0", 5), new INSTRUCTION("???", "XXX", "IMP", 5), new INSTRUCTION("INX", "INX", "IMP", 2), new INSTRUCTION("SBC", "SBC", "IMM", 2), new INSTRUCTION("NOP", "NOP", "IMP", 2), new INSTRUCTION("???", "SBC", "IMP", 2), new INSTRUCTION("CPX", "CPX", "ABS", 4), new INSTRUCTION("SBC", "SBC", "ABS", 4), new INSTRUCTION("INC", "INC", "ABS", 6), new INSTRUCTION("???", "XXX", "IMP", 6), 
			new INSTRUCTION("BEQ", "BEQ", "REL", 2), new INSTRUCTION("SBC", "SBC", "IZY", 5), new INSTRUCTION("???", "XXX", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 8), new INSTRUCTION("???", "NOP", "IMP", 4), new INSTRUCTION("SBC", "SBC", "ZPX", 4), new INSTRUCTION("INC", "INC", "ZPX", 6), new INSTRUCTION("???", "XXX", "IMP", 6), new INSTRUCTION("SED", "SED", "IMP", 2), new INSTRUCTION("SBC", "SBC", "ABY", 4), new INSTRUCTION("NOP", "NOP", "IMP", 2), new INSTRUCTION("???", "XXX", "IMP", 7), new INSTRUCTION("???", "NOP", "IMP", 4), new INSTRUCTION("SBC", "SBC", "ABX", 4), new INSTRUCTION("INC", "INC", "ABX", 7), new INSTRUCTION("???", "XXX", "IMP", 7), 
		];
		
		this.lookup_cycles = [
			7, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 4, 4, 6, 6, 
			2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, 
			6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 4, 4, 6, 6, 
			2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, 
			6, 6, 2, 8, 3, 3, 5, 5, 3, 2, 2, 2, 3, 4, 6, 6, 
			2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, 
			6, 6, 2, 8, 3, 3, 5, 5, 4, 2, 2, 2, 5, 4, 6, 6, 
			2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, 
			2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4, 
			2, 6, 2, 6, 4, 4, 4, 4, 2, 5, 2, 5, 5, 5, 5, 5, 
			2, 6, 2, 6, 3, 3, 3, 3, 2, 2, 2, 2, 4, 4, 4, 4, 
			2, 5, 2, 5, 4, 4, 4, 4, 2, 4, 2, 4, 4, 4, 4, 4, 
			2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6, 
			2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, 
			2, 6, 2, 8, 3, 3, 5, 5, 2, 2, 2, 2, 4, 4, 6, 6, 
			2, 5, 2, 8, 4, 4, 6, 6, 2, 4, 2, 7, 4, 4, 7, 7, 
		];
		
		this.lookup_operate = [
			"BRK", "ORA", "XXX", "XXX", "NOP", "ORA", "ASL", "XXX", "PHP", "ORA", "ASL", "XXX", "NOP", "ORA", "ASL", "XXX", 
			"BPL", "ORA", "XXX", "XXX", "NOP", "ORA", "ASL", "XXX", "CLC", "ORA", "NOP", "XXX", "NOP", "ORA", "ASL", "XXX", 
			"JSR", "AND", "XXX", "XXX", "BIT", "AND", "ROL", "XXX", "PLP", "AND", "ROL", "XXX", "BIT", "AND", "ROL", "XXX", 
			"BMI", "AND", "XXX", "XXX", "NOP", "AND", "ROL", "XXX", "SEC", "AND", "NOP", "XXX", "NOP", "AND", "ROL", "XXX", 
			"RTI", "EOR", "XXX", "XXX", "NOP", "EOR", "LSR", "XXX", "PHA", "EOR", "LSR", "XXX", "JMP", "EOR", "LSR", "XXX", 
			"BVC", "EOR", "XXX", "XXX", "NOP", "EOR", "LSR", "XXX", "CLI", "EOR", "NOP", "XXX", "NOP", "EOR", "LSR", "XXX", 
			"RTS", "ADC", "XXX", "XXX", "NOP", "ADC", "ROR", "XXX", "PLA", "ADC", "ROR", "XXX", "JMP", "ADC", "ROR", "XXX", 
			"BVS", "ADC", "XXX", "XXX", "NOP", "ADC", "ROR", "XXX", "SEI", "ADC", "NOP", "XXX", "NOP", "ADC", "ROR", "XXX", 
			"NOP", "STA", "NOP", "XXX", "STY", "STA", "STX", "XXX", "DEY", "NOP", "TXA", "XXX", "STY", "STA", "STX", "XXX", 
			"BCC", "STA", "XXX", "XXX", "STY", "STA", "STX", "XXX", "TYA", "STA", "TXS", "XXX", "NOP", "STA", "XXX", "XXX", 
			"LDY", "LDA", "LDX", "XXX", "LDY", "LDA", "LDX", "XXX", "TAY", "LDA", "TAX", "XXX", "LDY", "LDA", "LDX", "XXX", 
			"BCS", "LDA", "XXX", "XXX", "LDY", "LDA", "LDX", "XXX", "CLV", "LDA", "TSX", "XXX", "LDY", "LDA", "LDX", "XXX", 
			"CPY", "CMP", "NOP", "XXX", "CPY", "CMP", "DEC", "XXX", "INY", "CMP", "DEX", "XXX", "CPY", "CMP", "DEC", "XXX", 
			"BNE", "CMP", "XXX", "XXX", "NOP", "CMP", "DEC", "XXX", "CLD", "CMP", "NOP", "XXX", "NOP", "CMP", "DEC", "XXX", 
			"CPX", "SBC", "NOP", "XXX", "CPX", "SBC", "INC", "XXX", "INX", "SBC", "NOP", "SBC", "CPX", "SBC", "INC", "XXX", 
			"BEQ", "SBC", "XXX", "XXX", "NOP", "SBC", "INC", "XXX", "SED", "SBC", "NOP", "XXX", "NOP", "SBC", "INC", "XXX", 
		];
		
		this.lookup_addrmode = [
			"IMM", "IZX", "IMP", "IMP", "IMP", "ZP0", "ZP0", "IMP", "IMP", "IMM", "IMP", "IMP", "IMP", "ABS", "ABS", "IMP", 
			"REL", "IZY", "IMP", "IMP", "IMP", "ZPX", "ZPX", "IMP", "IMP", "ABY", "IMP", "IMP", "IMP", "ABX", "ABX", "IMP", 
			"ABS", "IZX", "IMP", "IMP", "ZP0", "ZP0", "ZP0", "IMP", "IMP", "IMM", "IMP", "IMP", "ABS", "ABS", "ABS", "IMP", 
			"REL", "IZY", "IMP", "IMP", "IMP", "ZPX", "ZPX", "IMP", "IMP", "ABY", "IMP", "IMP", "IMP", "ABX", "ABX", "IMP", 
			"IMP", "IZX", "IMP", "IMP", "IMP", "ZP0", "ZP0", "IMP", "IMP", "IMM", "IMP", "IMP", "ABS", "ABS", "ABS", "IMP", 
			"REL", "IZY", "IMP", "IMP", "IMP", "ZPX", "ZPX", "IMP", "IMP", "ABY", "IMP", "IMP", "IMP", "ABX", "ABX", "IMP", 
			"IMP", "IZX", "IMP", "IMP", "IMP", "ZP0", "ZP0", "IMP", "IMP", "IMM", "IMP", "IMP", "IND", "ABS", "ABS", "IMP", 
			"REL", "IZY", "IMP", "IMP", "IMP", "ZPX", "ZPX", "IMP", "IMP", "ABY", "IMP", "IMP", "IMP", "ABX", "ABX", "IMP", 
			"IMP", "IZX", "IMP", "IMP", "ZP0", "ZP0", "ZP0", "IMP", "IMP", "IMP", "IMP", "IMP", "ABS", "ABS", "ABS", "IMP", 
			"REL", "IZY", "IMP", "IMP", "ZPX", "ZPX", "ZPY", "IMP", "IMP", "ABY", "IMP", "IMP", "IMP", "ABX", "IMP", "IMP", 
			"IMM", "IZX", "IMM", "IMP", "ZP0", "ZP0", "ZP0", "IMP", "IMP", "IMM", "IMP", "IMP", "ABS", "ABS", "ABS", "IMP", 
			"REL", "IZY", "IMP", "IMP", "ZPX", "ZPX", "ZPY", "IMP", "IMP", "ABY", "IMP", "IMP", "ABX", "ABX", "ABY", "IMP", 
			"IMM", "IZX", "IMP", "IMP", "ZP0", "ZP0", "ZP0", "IMP", "IMP", "IMM", "IMP", "IMP", "ABS", "ABS", "ABS", "IMP", 
			"REL", "IZY", "IMP", "IMP", "IMP", "ZPX", "ZPX", "IMP", "IMP", "ABY", "IMP", "IMP", "IMP", "ABX", "ABX", "IMP", 
			"IMM", "IZX", "IMP", "IMP", "ZP0", "ZP0", "ZP0", "IMP", "IMP", "IMM", "IMP", "IMP", "ABS", "ABS", "ABS", "IMP", 
			"REL", "IZY", "IMP", "IMP", "IMP", "ZPX", "ZPX", "IMP", "IMP", "ABY", "IMP", "IMP", "IMP", "ABX", "ABX", "IMP", 
		];
	}
}
