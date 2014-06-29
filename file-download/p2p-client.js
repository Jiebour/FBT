var dgram = require('dgram'),
    fs = require('fs'),
    randomAccessFile = require('random-access-file'),
    BSON = require('buffalo'),
    utils = require('./utils'),
    settings = require('./settings'),
    xxhash = require('xxhash');


var BLOCK_SIZE = settings.BLOCK_SIZE,
    source_file = settings.source_file,
    download_file = settings.download_file,
    filesize = settings.filesize,
    unit_delay_time = settings.unit_delay_time,
    BLOCK_IN_PART = settings.BLOCK_IN_PART;


var socket = dgram.createSocket('udp4');
socket.bind(9999);
// 这个值目前双方都知道, 实际应该是通过STUN获知

addEventListener(socket, source_file, download_file);
var totalblocks = parseInt((filesize+BLOCK_SIZE-1)/BLOCK_SIZE);
var partsize = BLOCK_IN_PART * BLOCK_SIZE;
var totalparts = parseInt((filesize+partsize-1)/partsize);

var download_record = [],// 记录下载过的块, download_record[blockID]=1
    last_download_record = [],
    tobe_check = [];  // 记录未校验过的块, 校验通过则删除这个blockID

console.time("downloading");

for (var i=0; i<totalblocks; i++) {
    tobe_check[i] = i;
}

verify_part(0);

fs.open(settings.source_file, "r", function (err, fd1) {
    fs.open(settings.download_file, "a+", function(err, fd2) {
        global.fd1 = fd1;  // 以防之后fd消失
        global.fd2 = fd2;  // fd2用a+可在文件不存在时创建, 否则无法获取fd, 同时可以断点续传
    });
});

function download_part(partID) { // 一次只下载一个part, 校验完成之后下载下一个
    var i;
    if (BLOCK_IN_PART*(partID + 1) > totalblocks) {
        for(i=BLOCK_IN_PART*partID; i<totalblocks; ++i){
            downloadFile(socket, settings.server_ip, 8800+utils.rand3(), i);
        }
    }
    else {
        for(i=BLOCK_IN_PART*partID; i<BLOCK_IN_PART*(partID+1); ++i){
            downloadFile(socket, settings.server_ip, 8800+utils.rand3(), i);
        }
    }
}

function verify_part(partID) {
    if (partID >= totalparts) return 1; // 处理完所有part, 返回1

    var part_first_block = BLOCK_IN_PART * partID,
        part_last_block = (BLOCK_IN_PART*(partID+1)>totalblocks) ?
                            totalblocks : BLOCK_IN_PART*(partID+1); // lastblock实际上是last+1

    global.congestion = global.last_congestion = BLOCK_IN_PART;
    download_part(partID);
    var interval_obj = setInterval(function(){
        // global.congestion代表将接收到的块数量, 如果太大, 说明重发请求多, 接收到的少, 不暂停重发
        if (global.congestion <= global.last_congestion && utils.arrayEqual(download_record, last_download_record)){
            // 这一次接收已经结束
            var redownloadcount = 0; // 记录这一次重新下载的块的数量
            for (var i = part_first_block; i< part_last_block; i++) {
                if (!download_record[i]) {
                    redownloadcount++;
                    global.congestion++;
//                    console.log("redownload block: ", i);
                    downloadFile(socket, settings.server_ip, 8800 + utils.rand3(), i);
                }
            }
            global.last_congestion = global.congestion; // 原来的congestion+redownloadcount
            if (redownloadcount == 0){
                console.log("redownload complete");
                if (utils.allOne(download_record.slice(part_first_block, part_last_block))) {
                    clearInterval(interval_obj);
                    var return_value = verify_part(partID + 1); // 一般是undefined, 结束时是1
                    if (return_value) {
                        console.timeEnd("downloading");
                        console.log(xxhash.hash(fs.readFileSync(settings.source_file), 0xAAAA));
                        console.log(xxhash.hash(fs.readFileSync(settings.download_file), 0xAAAA));
                        console.log("download complete! exiting...");
                        setTimeout(function(){
                            process.exit(0);
                        }, unit_delay_time);  // delay 1
                    }
                }
            }
        }
        else{
            last_download_record = download_record;
        }
    }, 200);
}


function downloadFile(socket, IP, PORT, blockID) {
    var toSend = BSON.serialize({file: source_file, index: blockID});
    socket.send(toSend, 0, toSend.length, PORT, IP);
    //TODO the real file to transfer
}

function addEventListener(socket, remoteFile, localFile) {
    var file = randomAccessFile(localFile);
    socket.on('message', function(data, rinfo) {
//        console.log("receiving data from ", rinfo.address, ':', rinfo.port);
//        console.log('dataToProcesslength: ', dataToProcess.length);
//            console.log("receiving size:" + dataToProcess.slice(0, index).length);
        var jsonData = BSON.parse(data);
        //has file content
        if (utils.hasFileContent(jsonData)){
            var chunksData = jsonData["content"],
                blockID = jsonData["index"];
            download_record[blockID] = 1;
            file.write(blockID*BLOCK_SIZE, chunksData, function(err) {
                if(err)
                    console.log("blockID download err:" + blockID);
                else{
                    global.congestion--;
//                        console.log("blockID download OK:" + blockID);
                }
            });
        } else{
            console.log("Waning: bson is not a file content...");
        }
    });

    //handle closed
    socket.on('close', function() {
        console.log('OK! server closed connection')
    });

    socket.on('error', function(err) {
        console.log(err);
    });
}
