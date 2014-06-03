var xxhash = require('xxhash');
var fs = require('fs');
var path = require('path');

filepath = 'C:/Users/dell/Downloads/[SumiSora&CASO][Hanasakuiroha][BDRIP]';
filepath2 = 'C:/Users/dell/Downloads/[青涩文学系列][Aoi Bungaku Series][BDrip][1080p][Vol.1-Vol.6 Fin][POPGO]';
files = fs.readdirSync(filepath2);

var filelist = [];
for (var i= 0; i< files.length; i++) {
    var filename = path.join(filepath2, files[i]);
    if (filename.slice(-3) == 'mkv')
       filelist = filelist.concat([filename, filename, filename]);
    if (filelist.length >= 12)
        break;
}

var output = '';
var n = 0;
function hash(fullpath, time) {
    var hasher = new xxhash(0xCAFEBABE);

    fs.createReadStream(fullpath)
        .on('data', function(data) {
            hasher.update(data);
        })
        .on('end', function() {
            var elapsed_time = parseInt(process.hrtime(time)[1]/1000000);
            output += elapsed_time + '\n';
            console.log(elapsed_time);
            n++;
            if (n < filelist.length) {
                var nextfullpath = filelist[n];
                if (nextfullpath != fullpath) {
                    var fileinfo = path.basename(nextfullpath) + ' ' + fs.statSync(nextfullpath)['size'];
                    output += fileinfo + '\n';
                    console.log(fileinfo);
                }
                time = process.hrtime();
                hash(filelist[n], time);
            }
            else {
                fs.appendFileSync('file.txt', output);
            }
        }
    );
}

time = process.hrtime();
console.log(path.basename(filelist[0]) + ' ' + fs.statSync(filelist[0])['size']);
output += path.basename(filelist[0]) + ' ' + fs.statSync(filelist[0])['size'] + '\n';
hash(filelist[n], time);
