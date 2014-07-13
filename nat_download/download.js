var dgram = require('dgram'),
    fs = require('fs'),
    randomAccessFile = require('random-access-file'),
    BSON = require('buffalo'),
    utils = require('./utils'),
    settings = require('./settings'),
    xxhash = require('xxhash');

var BLOCK_SIZE = settings.BLOCK_SIZE,
    unit_delay_time = settings.unit_delay_time,
    BLOCK_IN_PART = settings.BLOCK_IN_PART,
    partsize = settings.partsize;

var DOWNLOAD_OVER = settings.DownloadState['DOWNLOAD_OVER'],
    DOWNLOADING = settings.DownloadState['DOWNLOADING'],
    CANCELED = settings.DownloadState['CANCELED'],
    PAUSED = settings.DownloadState['PAUSED'],
    DOWNLOAD_ERR = settings.DownloadState['DOWNLOAD_ERR'];


function addEventListener(socket, remoteFile, localFile, congestion) {
    var file = randomAccessFile(localFile);
    socket.on('message', function(data, rinfo) {
        var jsonData = BSON.parse(data);
        if (utils.hasFileContent(jsonData)){
            var chunksData = jsonData["content"];
            var blockID = jsonData["index"];
            var checksum = jsonData["checksum"];
            global.download_record[blockID] = 1;
            global.checksum_record[blockID] = checksum;

            file.write(blockID*BLOCK_SIZE, chunksData, function(err) {
                if(err)
                    console.log("blockID download err:" + blockID);
                else{
                    congestion.value--;
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


function download_block(socket, blockID, ip, port) {
    var toSend = BSON.serialize({file: global.source_file, index: blockID});
    socket.send(toSend, 0, toSend.length, port, ip);
}

function download_part(socket, partID, ip, port) { // 一次只下载一个part, 校验完成之后下载下一个
    var i;
    if (BLOCK_IN_PART*(partID + 1) > global.totalblocks) {
        for(i=BLOCK_IN_PART*partID; i<global.totalblocks; ++i){
            download_block(socket, i ,ip, port);
        }
    }
    else {
        for(i=BLOCK_IN_PART*partID; i<BLOCK_IN_PART*(partID+1); ++i){
            download_block(socket, i ,ip, port);
        }
    }
}

function verify_part(socket, index, part_queue, ip, port, congestion, last_congestion) {
    if (index >= part_queue.length) return 1; // 处理完所有part, 返回1

    var part_first_block = BLOCK_IN_PART * part_queue[index],
        part_last_block = (BLOCK_IN_PART*(part_queue[index]+1)>global.totalblocks) ?
                            global.totalblocks : BLOCK_IN_PART*(part_queue[index]+1); // lastblock实际上是last+1

    download_part(socket, part_queue[index], ip, port);
    var interval_obj = setInterval(function(){
        // congestion代表将接收到的块数量, 如果太大, 说明重发请求多, 接收到的少, 暂停重发进行空循环
        if (global.status !== DOWNLOADING)
            return;

        if (congestion.value <= last_congestion.value &&
        utils.arrayEqual(global.download_record, global.last_download_record)){
            // 这一次接收已经结束
            var redownloadcount = 0; // 记录这一次重新下载的块的数量
            for (var i = part_first_block; i< part_last_block; i++) {
                if (!global.download_record[i]) {
                    redownloadcount++;
                    congestion.value++;
                    download_block(socket, i ,ip, port);
                }
            }
            last_congestion.value = congestion.value; // 原来的congestion+redownloadcount
            if (redownloadcount === 0){
                if (utils.allOne(global.download_record.slice(part_first_block, part_last_block))) {
                    clearInterval(interval_obj);
                    // return_value一般是undefined, 结束时是1
                    var return_value = verify_part(socket, index + 1, part_queue,
                                        ip, port, congestion, last_congestion);
                    if (return_value) {
                        console.timeEnd("downloading");
                        console.log("download complete! start checking...");
                        // 移除handler中不需要的部分, 为后面校验+重传做准备
                        socket.removeAllListeners("message");
                        var file = randomAccessFile(global.download_file);
                        socket.on('message', function(data, rinfo) {
                            var jsonData = BSON.parse(data);
                            if (utils.hasFileContent(jsonData)){
                                var chunksData = jsonData["content"];
                                var blockID = jsonData["index"];
                                var checksum = jsonData["checksum"];
                                global.checksum_record[blockID] = checksum;
                                file.write(blockID*BLOCK_SIZE, chunksData, function(err) {
                                    if(err)
                                        console.log("blockID download err:" + blockID);
                                    else
                                        console.log("redownload diff block: " + blockID);
                                });
                            } else{
                                console.log("Waning: bson is not a file content...");
                            }
                        });
                        console.time("checking");
                        global.complete_socket++;
                        if (global.complete_socket === global.available_clients.length) {
                            global.status = DOWNLOAD_OVER;
                            global.StatusEmitter.emit("complete");
                        }
                    }
                }
            }
        }
        else{
            global.last_download_record = global.download_record;
        }
    }, 200);
}


function socket_download(socket, ip, port){
    socket.removeAllListeners("message");
    console.log("downloader listening on " + socket.address().port);
    console.log("prepare to download");
    console.time("downloading");

    var congestion = {value: BLOCK_IN_PART};
    var last_congestion = {value: BLOCK_IN_PART};
    addEventListener(socket, global.source_file, global.download_file, congestion);
    verify_part(socket, 0, socket.part_queue, ip, port, congestion, last_congestion);
}

exports.socket_download = socket_download;
exports.download_block = download_block;
