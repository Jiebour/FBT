var dgram = require('dgram'),
    fs = require('fs'),
    randomAccessFile = require('random-access-file'),
    BSON = require('buffalo'),
    utils = require('./utils'),
    settings = require('./settings');


var BLOCK_SIZE = settings.BLOCK_SIZE,
    SPLITTER = settings.SPLITTER,
    BF_SPLITTER = new Buffer(SPLITTER),
    SPLITTERLENGTH = settings.SPLITTERLENGTH,
    source_file = settings.source_file,
    download_file = settings.download_file,
    filesize = settings.filesize;


var socket = dgram.createSocket('udp4');
socket.bind(9999);
// 这个值目前双方都知道, 实际应该是通过STUN获知

addEventListener(socket, source_file, download_file);
var dataToProcess = new Buffer(0);
var totalblocks = parseInt(filesize/BLOCK_SIZE) + 1;
for(var i=0; i<totalblocks; ++i){
    downloadFile(socket, '127.0.0.1', 8800+utils.rand3(), i);
}


function downloadFile(socket, IP, PORT, blockID) {
    var toSend = BSON.serialize({file: source_file, index: blockID});
    toSend = Buffer.concat([toSend, BF_SPLITTER]);
    socket.send(toSend, 0, toSend.length, PORT, IP);
    //TODO the real file to transfer
}

function addEventListener(socket, remoteFile, localFile) {
    socket.on('message', function(data, rinfo) {
//        console.log("receiving data from ", rinfo.ip, ':', rinfo.port);
        dataToProcess = Buffer.concat([dataToProcess, data]);
        console.log('dataToProcesslength: ', dataToProcess.length);
        var index = utils.indexOfSplitter(dataToProcess);
        while(index>-1) {
//            console.log("receiving size:" + dataToProcess.slice(0, index).length);
            var jsonData = BSON.parse(dataToProcess.slice(0, index));
            //has file content
            if(utils.hasFileContent(jsonData)){
                var chunksData = jsonData["content"],
                    blockID = jsonData["index"];
                var file = randomAccessFile(localFile);
                // write 是异步的!在callback触犯的时候blockID已经不是之前的了, 就是最后那个, 所以输出的blockID都一样
                file.write(blockID*BLOCK_SIZE, chunksData, function(err) {
                    file.close();//TODO
                    if(err)
                        console.log("blockID download err:" + blockID);
                    else
                        console.log("blockID download OK:" + blockID);
                });
            }else{
                console.log("Waning: bson is not a file content...");
            }
            // Cuts off the processed chunk
            dataToProcess = dataToProcess.slice(index+SPLITTERLENGTH, dataToProcess.length);
            index = utils.indexOfSplitter(dataToProcess);
            console.log(index);
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
