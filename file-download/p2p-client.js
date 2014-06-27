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
    filesize = settings.filesize,
    unit_delay_time = settings.unit_delay_time,
    BLOCK_IN_PART = settings.BLOCK_IN_PART;


var socket = dgram.createSocket('udp4');
socket.bind(9999);
// 这个值目前双方都知道, 实际应该是通过STUN获知

addEventListener(socket, source_file, download_file);
var dataToProcess = new Buffer(0);
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
    fs.open(settings.download_file, "w+", function(err, fd2) {
        global.fd1 = fd1;  // 以防之后fd消失
        global.fd2 = fd2;  // fd2用w+可在文件不存在时创建, 否则无法获取fd
    });
});

function download_part(partID) { // 一次只下载一个part, 校验完成之后下载下一个
    var i;
    if (BLOCK_IN_PART*(partID + 1) > totalblocks) {
        for(i=BLOCK_IN_PART*partID; i<totalblocks; ++i){
            downloadFile(socket, '127.0.0.1', 8800+utils.rand3(), i);
        }
    }
    else {
        for(i=BLOCK_IN_PART*partID; i<BLOCK_IN_PART*(partID+1); ++i){
            downloadFile(socket, '127.0.0.1', 8800+utils.rand3(), i);
        }
    }
}

function verify_part(partID) {
    if (partID > totalparts) return 1; // 处理完所有part, 返回1

    var part_first_block = BLOCK_IN_PART * partID,
        part_last_block = (BLOCK_IN_PART*(partID+1)>totalblocks) ?
                            totalblocks : BLOCK_IN_PART*(partID+1); // lastblock实际上是last+1
    var part_tobe_check = tobe_check.slice(part_first_block, part_last_block);

    download_part(partID);
    var times = 0;
    var interval_obj = setInterval(function(){
        times ++;
        if (utils.arrayEqual(download_record, last_download_record)){
            // 这一次接收已经结束
            console.log("times: ", times);
            var redownloadcount = 0; // 记录这一次重新下载的块的数量
            for (var i = part_first_block; i< part_last_block; i++) {
                if (!download_record[i]) {
                    redownloadcount++;
//                    console.log("redownload block: ", i);
                    downloadFile(socket, '127.0.0.1', 8800 + utils.rand3(), i);
                }
            }
            if (redownloadcount == 0){
                console.log("redownload complete, checking hash...");
                // diff_block函数会更新part_tobe_check, 校验通过则删除对应的项, 不会影响tobe_check
                // 自己加callback函数?
                utils.diff_block(part_tobe_check, download_record, last_download_record, function(){
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
                });
            }
        }
        else{
            last_download_record = download_record;
        }
    }, 100); // delay 2
}


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
        while(index > -1) {
//            console.log("receiving size:" + dataToProcess.slice(0, index).length);
            var jsonData = BSON.parse(dataToProcess.slice(0, index));
            //has file content
            if (utils.hasFileContent(jsonData)){
                var chunksData = jsonData["content"],
                    blockID = jsonData["index"];
                download_record[blockID] = 1;
                var file = randomAccessFile(localFile);
                file.write(blockID*BLOCK_SIZE, chunksData, function(err) {
                    file.close();//TODO
                    if(err)
                        console.log("blockID download err:" + blockID);
                    else{
//                        console.log("blockID download OK:" + blockID);
                    }
                });
            } else{
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
