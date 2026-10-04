const fs = require('fs');
let c = fs.readFileSync('InactiveItems.jsx', 'utf8');
c = c.replace(/(\|\| "[^"]*?")"/g, '$1');
fs.writeFileSync('InactiveItems.jsx', c);
