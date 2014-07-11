var dgram = require('dgram'),
    fs = require('fs'),
    randomAccessFile = require('random-access-file'),
    BSON = require('buffalo'),
    utils = require('./../utils'),
    settings = require('./../settings'),
    xxhash = require('xxhash');


var BLOCK_SIZE = settings.BLOCK_SIZE,
    source_file = settings.source_file,
    download_file = settings.download_file,
    filesize = settings.filesize,
    unit_delay_time = settings.unit_delay_time,
    BLOCK_IN_PART = settings.BLOCK_IN_PART;

var totalblocks = parseInt((filesize+BLOCK_SIZE-1)/BLOCK_SIZE);
var partsize = BLOCK_IN_PART * BLOCK_SIZE;
var totalparts = parseInt((filesize+partsize-1)/partsize);


fs.open(source_file, "r+", function (err, fd1) {
    fs.open(download_file, "r+", function(err, fd2) {
        global.fd1 = fd1;
        global.fd2 = fd2;
    });
});

setTimeout(function(){
    var bf1 = Buffer(BLOCK_SIZE);
    var bf2 = Buffer(BLOCK_SIZE);
    function compare_block(readsize, i) {
        fs.read(global.fd1, bf1, 0, readsize, i * BLOCK_SIZE, function(err, bytesRead, bf1) {
            fs.read(global.fd2, bf2, 0, readsize, i * BLOCK_SIZE, function(err, bytesRead, bf2) {
                var result;
                console.log(bytesRead);
                if (i === totalblocks)
                    result = (xxhash.hash(bf1.slice(0, bytesRead), 1) === xxhash.hash(bf2.slice(0, bytesRead), 1));
                else
                    result = (xxhash.hash(bf1, 1) === xxhash.hash(bf2, 1));
                if (result !== true) {
                    console.log("block ", i, " not equal!");
                }
                else {
                    console.log("block ", i, " equal!");
                }
                if (i > 0) {
                    // 考虑到splice对index的影响, 采用逆序递归
                    compare_block(BLOCK_SIZE, i - 1);
                }
            });
        });
    }

    compare_block(filesize % BLOCK_SIZE, totalblocks-1);

}, 3000);


