var dgram = require('dgram'),
    fs = require('fs'),
    randomAccessFile = require('random-access-file'),
    BSON = require('buffalo'),
    utils = require('./utils'),
    settings = require('./settings'),
    xxhash = require('xxhash');


var BLOCK_SIZE = settings.BLOCK_SIZE,
    SPLITTER = settings.SPLITTER,
    BF_SPLITTER = new Buffer(SPLITTER),
    SPLITTERLENGTH = settings.SPLITTERLENGTH,
    source_file = settings.source_file,
    download_file = settings.download_file,
    filesize = settings.filesize
    unit_delay_time = settings.unit_delay_time;


var socket = dgram.createSocket('udp4');
socket.bind(9999);
// 这个值目前双方都知道, 实际应该是通过STUN获知

addEventListener(socket, source_file, download_file);
var dataToProcess = new Buffer(0);
var totalblocks = parseInt(filesize/BLOCK_SIZE) + 1;

var download_record = new Array(totalblocks),
    last_download_record = new Array(totalblocks),
    tobe_check = new Array(totalblocks);  // 记录未校验过的块

console.time("downloading");
for(var i=0; i<totalblocks; ++i){
    tobe_check[i] = i;
    downloadFile(socket, '127.0.0.1', 8800+utils.rand3(), i);
}

setTimeout(function(){
    var interval_obj = setInterval(function(){
        if (utils.arrayEqual(download_record, last_download_record)){
            // 这一次接收已经结束
            var redownloadcount = 0; // 记录这一次重新下载的块的数量
            for (var i = 0; i< totalblocks; i++) {
                if (!download_record[i]) {
                    redownloadcount++;
//                    console.log("redownload block: ", i);
                    downloadFile(socket, '127.0.0.1', 8800 + utils.rand3(), i);
                }
            }
            if (redownloadcount == 0){
                console.log("redownload complete, checking hash...");
                // show_diff_block函数会更新tobe_check, 校验通过则删除对应的项
                utils.show_diff_block(tobe_check, download_record, last_download_record);
                setTimeout(function(){
                    if (utils.allOne(download_record)) {
                        console.timeEnd("downloading");
                        console.log(xxhash.hash(fs.readFileSync(settings.source_file), 0xAAAA));
                        console.log(xxhash.hash(fs.readFileSync(settings.download_file), 0xAAAA));
                        console.log("download complete! exiting...");
                        clearInterval(interval_obj);
                        setTimeout(function(){
                            process.exit(0);
                        }, unit_delay_time);  // delay 1
                    }
                }, 4*unit_delay_time);  // delay 2
            }
        }
        else{
            last_download_record = download_record;
        }
    }, 1000); // delay 3
}, 2000);  // delay 4 这四个延时都是我随便写的, 肯定不是最优。靠延时似乎并不好, 暂时没想到别的方法


function downloadFile(socket, IP, PORT, blockID) {
    var toSend = BSON.serialize({file: source_file, index: blockID});
    toSend = Buffer.concat([toSend, BF_SPLITTER]);
    socket.send(toSend, 0, toSend.length, PORT, IP);
    //TODO the real file to transfer
}

function addEventListener(socket, remoteFile, localFile) {
    socket.on('message', function(data, rinfo) {
//        console.log("receiving data from ", rinfo.address, ':', rinfo.port);
        dataToProcess = Buffer.concat([dataToProcess, data]);
//        console.log('dataToProcesslength: ', dataToProcess.length);
        var index = utils.indexOfSplitter(dataToProcess);
        while(index>-1) {
//            console.log("receiving size:" + dataToProcess.slice(0, index).length);
            var jsonData = BSON.parse(dataToProcess.slice(0, index));
            //has file content
            if(utils.hasFileContent(jsonData)){
                var chunksData = jsonData["content"],
                    blockID = jsonData["index"];
                download_record[blockID] = 1;
                var file = randomAccessFile(localFile);
                file.write(blockID*BLOCK_SIZE, chunksData, function(err) {
                    file.close();//TODO
                    if(err)
                        console.log("blockID download err:" + blockID);
                    else{
                        console.log("blockID download OK:" + blockID);
                    }
                });
            }else{
                console.log("Waning: bson is not a file content...");
            }
            // Cuts off the processed chunk
            dataToProcess = dataToProcess.slice(index+SPLITTERLENGTH, dataToProcess.length);
            index = utils.indexOfSplitter(dataToProcess);
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
