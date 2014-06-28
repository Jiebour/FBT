var buffertools = require("buffertools");
var fs = require('fs');
var settings = require('./settings');
var xxhash = require('xxhash');

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
        if (a[i] !== 1)
            return false;
    }
    return true;
}


function countOne(a) {
    var count = 0;
    for (var i=0; i< a.length; i++) {
        if (a[i] === 1)
            count ++;
    }
    return count;
}


function diff_block(tobe_check, block_not_equal, download_record, last_download_record, callback) {
    if (tobe_check.length == 0) {
        // 这种情况在interval未到但是已经校验完该part的block时出现
        callback();
        return;
    }
    var blocksize=settings.BLOCK_SIZE, source=settings.source_file, download=settings.download_file;
    var totalblocks = parseInt((settings.filesize-1)/settings.BLOCK_SIZE);
    var bf1 = Buffer(blocksize);
    var bf2 = Buffer(blocksize);

    function compare_block(readsize, i, fd1, fd2) {
        // 有时候fd会莫名其妙地消失, 这时候只能重新调用diff_block生成fd1, fd2
        try {
            var block_index = tobe_check[i];
            fs.read(fd1, bf1, 0, readsize, block_index * blocksize, function (err, bytesRead, bf1) {
                fs.read(fd2, bf2, 0, readsize, block_index * blocksize, function (err, bytesRead, bf2) {
                    var result;
                    if (tobe_check[i] == totalblocks)
                        result = buffertools.compare(bf1.slice(0, bytesRead), bf2.slice(0, bytesRead));
                    else
                        result = buffertools.compare(bf1, bf2);

                    if (result != 0) {
                        console.log("block ", block_index, " not equal!");
                        // 校验未通过, 重新把block的下载记录置0, 之后会重新下载
                        last_download_record[block_index] = download_record[block_index] = 0;
                        block_not_equal.unshift(block_index);
                    }
                    else {
                        tobe_check.splice(i, 1);
//                        console.log("block ", block_index, " equal!");
                    }
                    if (i > 0) {
                        // 考虑到splice对index的影响, 采用逆序递归
                        compare_block(blocksize, i - 1, fd1, fd2);
                    }
                    else {
                        callback();
                    }
                });
            });
        }
        catch (e){
            console.log(e.message)
        }
    }

   if (tobe_check[tobe_check.length-1] == totalblocks)
       compare_block(settings.filesize % blocksize, tobe_check.length-1, global.fd1, global.fd2);
   else
       compare_block(blocksize, tobe_check.length-1, global.fd1, global.fd2);
}

exports.indexOfSplitter = indexOfSplitter;
exports.hasFileContent = hasFileContent;
exports.hasFileIndex = hasFileIndex;
exports.rand3 = rand3;
exports.arrayEqual = arrayEqual;
exports.allOne = allOne;
exports.diff_block = diff_block;


//var totalblocks = parseInt(settings.filesize/settings.BLOCK_SIZE);
//var download_record = new Array(totalblocks),
//    last_download_record = new Array(totalblocks),
//    tobe_check = new Array(totalblocks);
//for(var i=0; i<totalblocks+1; ++i) {
//    tobe_check[i] = i;
//}
//show_diff_block(tobe_check, download_record, last_download_record);
//