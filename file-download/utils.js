var buffertools = require("buffertools");
var fs = require('fs');
var settings = require('./settings');

var SPLITTER = '@@@@@';
function indexOfSplitter(buffer){
    for(var i=0; i < (buffer.length - 4); i++)
        if(buffertools.compare(buffer.slice(i, i+5), SPLITTER) == 0)
            return i;
    return -1;
}


function hasFileContent(jsonData){
    return "content" in jsonData;
}


function hasFileIndex(jsonData){
    return "index" in jsonData;
}


function rand3(){
    //Return a random number between 1 and 3:
    return Math.floor((Math.random() * 3) + 1);
}


function arrayEqual(a, b){
    // assume a.length == b.length
    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}


function allOne(a) {
    for (var i=0; i< a.length; i++) {
        if (a[i] != 1)
            return false;
    }
    return true;
}

function show_diff_block(download_record, last_download_record) {
    var blocksize=settings.BLOCK_SIZE, source=settings.source_file, download=settings.download_file;
    var totalblocks = parseInt(settings.filesize/blocksize);
    var temp = Buffer(blocksize);
    var temp2 = Buffer(blocksize);

    function compare_block(i, fd1, fd2) {
        fs.read(fd1, temp, 0, blocksize, i * blocksize, function (err, bytesRead, bf1) {
            fs.read(fd2, temp2, 0, blocksize, i * blocksize, function (err, bytesRead, bf2) {
                if (buffertools.compare(bf1, bf2) != 0) {
                    console.log("block ", i, " not equal!");
                    last_download_record[i] = download_record[i] = 0;
                }
                else
                    console.log("block ", i, " equal!");
                if (i < totalblocks){
                    compare_block(i+1, fd1, fd2);
                }
            });
        });
    }

    fs.open(source, "r", function (err, fd1) {
       fs.open(download, "r", function(err, fd2) {
           compare_block(0, fd1, fd2);
       });
    });
}

exports.indexOfSplitter = indexOfSplitter;
exports.hasFileContent = hasFileContent;
exports.hasFileIndex = hasFileIndex;
exports.rand3 = rand3;
exports.arrayEqual = arrayEqual;
exports.allOne = allOne;
exports.show_diff_block = show_diff_block;

//show_diff_block();