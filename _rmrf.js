const fs = require('fs');
const path = require('path');
const TARGET = 'C:/Users/haizhi/WorkBuddy/2026-07-13-10-54-28/_freshclone';
let fail = 0, ok = 0;
function rmrf(p) {
  let st;
  try { st = fs.lstatSync(p); } catch { return; }
  if (st.isDirectory()) {
    let children = [];
    try { children = fs.readdirSync(p); } catch { return; }
    for (const c of children) rmrf(path.join(p, c));
    try { fs.rmdirSync(p); ok++; } catch { /* empty-dir rmdir may be blocked; harmless */ }
  } else if (st.isFile() || st.isSymbolicLink()) {
    try { fs.unlinkSync(p); ok++; } catch (e) { fail++; if (fail <= 5) console.log('FAIL', p, e.message); }
  }
}
rmrf(TARGET);
console.log(`_freshclone removal: ${ok} removed, ${fail} failed`);
