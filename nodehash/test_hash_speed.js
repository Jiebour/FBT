var xxhash = require('xxhash'),
    crc = require('crc'),
    fs = require('fs');

var readstream = fs.createReadStream('files/file1');
readstream.on('readable', function() {
    var data = readstream.read(4096);

    console.time("xxhas");
    for (var i=0; i<100000; i++) {
        var value = xxhash.hash(data, seed=0xAAA);
//        console.log(typeof(value)); // output: number
        if (i == 999)
            console.timeEnd("xxhas");
    }

    console.time("crc");
    for (var i=0; i<100000; i++) {
        crc.crc32(data);
        if (i == 999) {
            console.timeEnd("crc");
            readstream.removeAllListeners('readable');
        }
    }
});
