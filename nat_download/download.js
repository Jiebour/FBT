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

var totalblocks = parseInt((filesize+BLOCK_SIZE-1)/BLOCK_SIZE);
var partsize = BLOCK_IN_PART * BLOCK_SIZE;
var totalparts = parseInt((filesize+partsize-1)/partsize);

var download_record = [],// 记录下载过的块, download_record[blockID]=1
    last_download_record = [],
    tobe_check = [];  // 记录未校验过的块, 校验通过则删除这个blockID


function addEventListener(socket, remoteFile, localFile) {
    var file = randomAccessFile(localFile);
    socket.on('message', function(data, rinfo) {
        var jsonData = BSON.parse(data);
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


function downloadFile(socket, IP, PORT, blockID) {
    var toSend = BSON.serialize({file: source_file, index: blockID});
    socket.send(toSend, 0, toSend.length, PORT, IP);
}

function download_part(socket, partID) { // 一次只下载一个part, 校验完成之后下载下一个
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

function verify_part(socket, partID) {
    if (partID >= totalparts) return 1; // 处理完所有part, 返回1

    var part_first_block = BLOCK_IN_PART * partID,
        part_last_block = (BLOCK_IN_PART*(partID+1)>totalblocks) ?
                            totalblocks : BLOCK_IN_PART*(partID+1); // lastblock实际上是last+1

    global.congestion = global.last_congestion = BLOCK_IN_PART;
    download_part(socket, partID);
    var interval_obj = setInterval(function(){
        // global.congestion代表将接收到的块数量, 如果太大, 说明重发请求多, 接收到的少, 不暂停重发
        if (global.congestion <= global.last_congestion && utils.arrayEqual(download_record, last_download_record)){
            // 这一次接收已经结束
            var redownloadcount = 0; // 记录这一次重新下载的块的数量
            for (var i = part_first_block; i< part_last_block; i++) {
                if (!download_record[i]) {
                    redownloadcount++;
                    global.congestion++;
                    downloadFile(socket, settings.server_ip, 8800 + utils.rand3(), i);
                }
            }
            global.last_congestion = global.congestion; // 原来的congestion+redownloadcount
            if (redownloadcount == 0){
                console.log("redownload complete");
                if (utils.allOne(download_record.slice(part_first_block, part_last_block))) {
                    clearInterval(interval_obj);
                    var return_value = verify_part(socket, partID + 1); // 一般是undefined, 结束时是1
                    if (return_value) {
                        console.timeEnd("downloading");
                        console.log("download complete! start checking...");
                        // 移除handler中不需要的部分
                        socket.removeAllListeners("message");
                        var file = randomAccessFile(download_file);
                        socket.on('message', function(data, rinfo) {
                            var jsonData = BSON.parse(data);
                            if (utils.hasFileContent(jsonData)){
                                var chunksData = jsonData["content"],
                                    blockID = jsonData["index"];
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
                        check(socket);  // 开始校验
                    }
                }
            }
        }
        else{
            last_download_record = download_record;
        }
    }, 200);
}


function check(socket) {
    /* 下载完之后对所有block进行校验 */
    if (tobe_check.length === 0) { // 所有block都通过校验
        console.log("checking complete");
        console.timeEnd("checking");
        console.log(xxhash.hash(fs.readFileSync(settings.source_file), 0xAAAA));
        console.log(xxhash.hash(fs.readFileSync(settings.download_file), 0xAAAA));
        setTimeout(function(){
            process.exit(0);
        }, unit_delay_time);
    }
    else {
        utils.diff_block(tobe_check, function(){
            tobe_check.forEach(function(blockID){
                downloadFile(socket, settings.server_ip, 8800+utils.rand3(), blockID);
            });
            setTimeout(check(socket), 300);
        });
    }
}

function socket_download(socket){
    socket.removeAllListeners("message");
    addEventListener(socket, source_file, download_file);
    console.log("downloader listening on " + socket.address().port);
    console.log("prepare to download");
    console.time("downloading");

    for (var i=0; i<totalblocks; i++) {
        tobe_check[i] = i;
    }


    verify_part(socket, 0);
}

exports.socket_download = socket_download;
