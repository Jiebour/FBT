var fs = require('fs');
var settings = require('./settings');
var crc = require('crc');

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


function get_checksum(bf) {
    var crc32 = new crc.CRC32();
    crc32.update(bf);
    return crc32.checksum(); // int
}


function crc_check(data, checksum) {
    var crc32 = new crc.CRC32();
    crc32.update(data);
    return crc32.checksum() === checksum;
}


function diff_block(tobe_check, callback) {
    if (tobe_check.length === 0) {
        // 这种情况在interval未到但是已经校验完该part的block时出现
        callback();
        return;
    }
    var BLOCK_SIZE=settings.BLOCK_SIZE;
    var totalblocks = parseInt((settings.filesize-1)/BLOCK_SIZE);
    var bf2 = Buffer(BLOCK_SIZE);

    function compare_block(i, fd2) {
        try {
            var blockID = tobe_check[i];
            fs.read(fd2, bf2, 0, BLOCK_SIZE, blockID*BLOCK_SIZE, function (err, bytesRead, bf2) {
                var result;
                if (tobe_check[i] === totalblocks) {
                    bf2 = bf2.slice(0, bytesRead);
                    result = crc_check(bf2, global.checksum_record[blockID]);
                }
                else
                    result = crc_check(bf2, global.checksum_record[blockID]);
                if (result === false) {
                    console.log("block ", blockID, " not equal!");
                }
                else {
                    tobe_check.splice(i, 1);
//                    console.log("block ", blockID, " equal!");
                }
                if (i > 0) {
                    // 考虑到splice对index的影响, 采用逆序递归
                    compare_block(i - 1, fd2);
                }
                else {
                    callback();
                }
            });
        }
        catch (e){
            console.log(e.message);
        }
    }

    compare_block(tobe_check.length-1, global.fd2);
}

exports.hasFileContent = hasFileContent;
exports.hasFileIndex = hasFileIndex;
exports.rand3 = rand3;
exports.arrayEqual = arrayEqual;
exports.allOne = allOne;
exports.diff_block = diff_block;
exports.get_checksum = get_checksum;
exports.crc_check = crc_check;
