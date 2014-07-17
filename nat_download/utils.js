var fs = require('fs');
var settings = require('./settings');
var crc = require('crc');
var tobe_check = global.tobe_check;


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
    var BLOCK_SIZE = settings.BLOCK_SIZE;
    var totalblocks = global.totalblocks;
    var bf2 = Buffer(BLOCK_SIZE);
    var filesize = global.filesize;

    function compare_block(i, fd2) {
        try {
            var blockID = tobe_check[i];
            fs.read(fd2, bf2, 0, BLOCK_SIZE, blockID*BLOCK_SIZE, function (err, bytesRead, bf2) {
                var result;
                if (tobe_check[i] === totalblocks - 1) {
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


function addr2bytes(addr, nat_type_id) {
    var host = addr.ip;  // "0.0.0.0"
    var port = addr.port;  // int 23456
    var bytes = Buffer(7);  // 和之前不同,现在用7个字节
    var first4bytes = Buffer(host.split('.'));  // 用数字初始化
    var byte5 = Math.floor(port/256);
    var byte6 = port - byte5 * 256;
    var next2bytes = Buffer([byte6, byte5]);
    first4bytes.copy(bytes);
    next2bytes.copy(bytes, 4);
    // 因为id不会超过4, 所以写最后一个字节就行, 1=0x33, 注意是字符串不是Int
    bytes.write(nat_type_id.toString(), 6);
    return bytes;
}


function bytes2addr(bytes) {
    var nat_type_id = bytes.readUInt8(6);  // 这是字符串不是Int
    var ip = Array();
    for (var i=0; i<4;i++) {
        ip.push(bytes.readUInt8(i));
    }
    ip = ip.join('.');
    var port = bytes.readUInt16LE(4);
    return [ip, port, nat_type_id];
}


exports.bytes2addr = bytes2addr;
exports.addr2bytes = addr2bytes;
exports.hasFileContent = hasFileContent;
exports.hasFileIndex = hasFileIndex;
exports.rand3 = rand3;
exports.arrayEqual = arrayEqual;
exports.allOne = allOne;
exports.get_checksum = get_checksum;
exports.crc_check = crc_check;
exports.diff_block = diff_block;
