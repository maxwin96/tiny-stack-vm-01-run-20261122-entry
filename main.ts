const fs = require("node:fs"), path = require("node:path");
const IN = process.argv[2] || "/input", OUT = process.argv[3] || "/output";

// Tiny stack VM, ISA v1. 32-bit wrapping ints, 256-value stack,
// 64-entry call stack, 256 words of memory, traps 2..11.
function run(p, inp) {
  const s = new Int32Array(256); let sp = 0;
  const c = new Int32Array(64); let cp = 0;
  const m = new Int32Array(256);
  const o = Buffer.alloc(65536); let ol = 0, pc = 0, st = 0, ip = 0;
  const ret = (e) => ({ o: o.subarray(0, ol), e });
  while (1) {
    if (st >= 1000000) return ret(10);
    if (pc < 0 || pc >= p.length) return ret(9);
    const op = p[pc];
    const known = op <= 7 || (op >= 16 && op <= 30) || (op >= 32 && op <= 34)
      || (op >= 48 && op <= 52) || op === 64 || op === 65 || (op >= 80 && op <= 83);
    if (!known) return ret(5);
    const il = op === 1 ? 1 : op === 2 ? 4 : (op >= 48 && op <= 51) ? 2 : 0;
    if (pc + 1 + il > p.length) return ret(9);
    let nd = 0, gv = 0;
    if (op === 1 || op === 2 || op === 82) gv = 1;
    else if (op === 4) { nd = 1; gv = 2; }
    else if (op === 6) { nd = 2; gv = 3; }
    else if (op === 5) { nd = 2; gv = 2; }
    else if (op === 7) { nd = 3; gv = 3; }
    else if (op === 23 || op === 27 || op === 64) { nd = 1; gv = 1; }
    else if ((op >= 16 && op <= 30) || (op >= 32 && op <= 34)) { nd = 2; gv = 1; }
    else if (op === 65) nd = 2;
    else if (op === 3 || op === 49 || op === 50 || op === 80 || op === 81 || op === 83) nd = 1;
    if (sp < nd) return ret(2);
    if (sp - nd + gv > 256) return ret(3);
    st++;
    let a, b, v, t;
    switch (op) {
      case 0: return ret(0);
      case 1: v = p[pc + 1]; s[sp++] = v > 127 ? v - 256 : v; pc += 2; break;
      case 2: s[sp++] = p.readInt32LE(pc + 1); pc += 5; break;
      case 3: sp--; pc++; break;
      case 4: s[sp] = s[sp - 1]; sp++; pc++; break;
      case 5: t = s[sp - 1]; s[sp - 1] = s[sp - 2]; s[sp - 2] = t; pc++; break;
      case 6: s[sp] = s[sp - 2]; sp++; pc++; break;
      case 7: a = s[sp - 3]; s[sp - 3] = s[sp - 2]; s[sp - 2] = s[sp - 1]; s[sp - 1] = a; pc++; break;
      case 23: s[sp - 1] = (-s[sp - 1]) | 0; pc++; break;
      case 27: s[sp - 1] = ~s[sp - 1]; pc++; break;
      case 48: pc = pc + 3 + p.readInt16LE(pc + 1); break;
      case 49: v = s[--sp]; pc = v === 0 ? pc + 3 + p.readInt16LE(pc + 1) : pc + 3; break;
      case 50: v = s[--sp]; pc = v !== 0 ? pc + 3 + p.readInt16LE(pc + 1) : pc + 3; break;
      case 51:
        if (cp >= 64) return ret(7);
        c[cp++] = pc + 3; pc = p.readUInt16LE(pc + 1); break;
      case 52:
        if (cp === 0) return ret(8);
        pc = c[--cp]; break;
      case 64:
        a = s[sp - 1];
        if (a < 0 || a > 255) return ret(6);
        s[sp - 1] = m[a]; pc++; break;
      case 65:
        a = s[sp - 1]; v = s[sp - 2];
        if (a < 0 || a > 255) return ret(6);
        m[a] = v; sp -= 2; pc++; break;
      case 80:
        v = s[--sp]; t = String(v);
        if (ol + t.length > 65536) return ret(11);
        o.write(t, ol); ol += t.length; pc++; break;
      case 81:
        v = s[--sp];
        if (ol >= 65536) return ret(11);
        o[ol++] = v & 255; pc++; break;
      case 82: s[sp++] = ip < inp.length ? inp[ip++] : -1; pc++; break;
      case 83: v = s[--sp]; return ret(v & 255);
      default: { // binary ops 16-22, 24-26, 28-30, 32-34
        b = s[--sp]; a = s[sp - 1];
        let r;
        if (op === 16) r = (a + b) | 0;
        else if (op === 17) r = (a - b) | 0;
        else if (op === 18) r = Math.imul(a, b);
        else if (op === 19) {
          if (b === 0) return ret(4);
          r = (a === -2147483648 && b === -1) ? -2147483648 : (Math.trunc(a / b) | 0);
        } else if (op === 20) {
          if (b === 0) return ret(4);
          r = b === -1 ? 0 : (a % b) | 0;
        } else if (op === 21) {
          if (b === 0) return ret(4);
          r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
        } else if (op === 22) {
          if (b === 0) return ret(4);
          r = ((a >>> 0) % (b >>> 0)) | 0;
        } else if (op === 24) r = a & b;
        else if (op === 25) r = a | b;
        else if (op === 26) r = a ^ b;
        else if (op === 28) r = a << (b & 31);
        else if (op === 29) r = a >> (b & 31);
        else if (op === 30) r = (a >>> (b & 31)) | 0;
        else if (op === 32) r = a === b ? 1 : 0;
        else if (op === 33) r = a < b ? 1 : 0;
        else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
        s[sp - 1] = r; pc++;
      }
    }
  }
}

for (let n = 1; n <= 40; n++) {
  const id = "i" + String(n).padStart(3, "0");
  let p, inp;
  try { p = fs.readFileSync(path.join(IN, id, "program.bin")); } catch { p = Buffer.alloc(0); }
  try { inp = fs.readFileSync(path.join(IN, id, "input.bin")); } catch { inp = Buffer.alloc(0); }
  const r = run(p, inp);
  const od = path.join(OUT, id);
  fs.mkdirSync(od, { recursive: true });
  fs.writeFileSync(path.join(od, "stdout.bin"), r.o);
  fs.writeFileSync(path.join(od, "exit.txt"), String(r.e) + "\n");
}
