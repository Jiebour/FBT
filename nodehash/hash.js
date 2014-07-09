var xxhash = require('xxhash');
var fs = require('fs');
var path = require('path');

var filepath = 'C:/Users/dell/Downloads/[SumiSora&CASO][Hanasakuiroha][BDRIP]';
var filepath2 = "files/test.mp4";
//files = fs.readdirSync(filepath2);
//
//var filelist = [];
//for (var i= 0; i< files.length; i++) {
//    var filename = path.join(filepath2, files[i]);
//    if (filename.slice(-3) == 'mkv')
//       filelist = filelist.concat([filename, filename, filename]);
//    if (filelist.length >= 12)
//        break;
//}

var output = '';
var n = 0;
function hash(fullpath, time) {
    var hasher = new xxhash(0xCAFEBABE);

    fs.createReadStream(fullpath)
        .on('data', function(data) {
            hasher.update(data);
        })
        .on('end', function() {
            console.timeEnd("hash");
        });
}

console.time("hash");
//console.log(path.basename(filelist[0]) + ' ' + fs.statSync(filelist[0])['size']);
//output += path.basename(filelist[0]) + ' ' + fs.statSync(filelist[0])['size'] + '\n';
hash(filepath2);
