const fs = require('fs');
let c = fs.readFileSync('InactiveItems.jsx', 'utf8');

c = c.replace(/\{grp\.sku \|\| "[^"]*?""\}/g, '{grp.sku || "-"}');
c = c.replace(/\{it\.sku \|\| "[^"]*?""\}/g, '{it.sku || "-"}');
c = c.replace(/\{v\.contactPerson \|\| "[^"]*?""\}/g, '{v.contactPerson || "-"}');
c = c.replace(/\{v\.phone \|\| "[^"]*?""\}/g, '{v.phone || "-"}');

fs.writeFileSync('InactiveItems.jsx', c);
console.log("Done");
