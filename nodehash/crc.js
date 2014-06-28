var crc = require('crc'),
    fs = require('fs');

console.time("CRC");
crc.crc32(fs.readFileSync('files/484M'));
console.timeEnd("CRC");
