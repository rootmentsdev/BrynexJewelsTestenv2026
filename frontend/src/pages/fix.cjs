const fs = require('fs');
let c = fs.readFileSync('InactiveItems.jsx', 'utf8');
// Fix strange characters
c = c.replace(/\|\| ".*?""/g, '|| "-"');
fs.writeFileSync('InactiveItems.jsx', c);
