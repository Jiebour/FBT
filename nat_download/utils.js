var fs = require('fs');
var settings = require('./settings');
var xxhash = require('xxhash');
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

var crc = require('crc');

var bf = Buffer("test");

charlist = crc.crc32(bf).toString();
var k = []
for (var i=0; i< 8; i++) {
    k.push(parseInt(charlist[i], 16));
}
var checksum = Buffer(k);

transfer_data = Buffer.concat([bf, checksum]);

////////////////////// Network Transfer /////////////////////////

received_data = transfer_data

checksum = received_data.slice(-8);
charlist = '';
for (var i=0; i<8; i++) {
    charlist += checksum.readUInt8(i).toString(16);
}

// these two should be equal if data received correctly
console.log(crc.crc32(received_data.slice(0, -8)));
console.log(charlist)


function diff_block(tobe_check, filesize, source_file, download_file, callback) {
    if (tobe_check.length == 0) {
        // 这种情况在interval未到但是已经校验完该part的block时出现
        callback();
        return;
    }
    var blocksize=settings.BLOCK_SIZE, source=source_file, download=download_file;
    var totalblocks = parseInt((filesize-1)/settings.BLOCK_SIZE);
    var bf1 = Buffer(blocksize);
    var bf2 = Buffer(blocksize);

    function compare_block(readsize, i, fd2) {
        try {
            var block_index = tobe_check[i];
            source_file_block_hash = get_block_hash()  // TODO
            fs.read(fd2, bf2, 0, readsize, block_index * blocksize, function (err, bytesRead, bf2) {
                var result;
                if (tobe_check[i] == totalblocks)
                    result = source_file_block_hash === crc.crc32(bf2.slice(0, bytesRead)) ? 0 : 1;
                else
                    result = (source_file_block_hash === crc.crc32(bf2)) ? 0 : 1;
                if (result !== 0) {
                    console.log("block ", block_index, " not equal!");
                    // 校验未通过, 重新把block的下载记录置0, 之后会重新下载
                }
                else {
                    tobe_check.splice(i, 1);
//                        console.log("block ", block_index, " equal!");
                }
                if (i > 0) {
                    // 考虑到splice对index的影响, 采用逆序递归
                    compare_block(blocksize, i - 1, fd2);
                }
                else {
                    callback();
                }
            });
        }
        catch (e){
            console.log(e.message)
        }
    }

   if (tobe_check[tobe_check.length-1] == totalblocks)
       compare_block(filesize % blocksize, tobe_check.length-1, global.fd2);
   else
       compare_block(blocksize, tobe_check.length-1, global.fd2);
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
exports.diff_block = diff_block;
