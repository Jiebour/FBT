var dgram = require("dgram"),
    fs = require("fs"),
    bson = require('buffalo'),
    utils = require('./utils'),
    settings = require('./settings');

var BLOCK_SIZE = settings.BLOCK_SIZE,
    SPLITTER = settings.SPLITTER,
    BF_SPLITTER = new Buffer(SPLITTER),
    SPLITTERLENGTH = settings.SPLITTERLENGTH,
    source_file = settings.source_file;

var connectionCnt = 0;
var dataToProcess = new Buffer(0);

function addEventListener(socket) {
    var toSend = new Buffer(0);
    connectionCnt++;
    socket.on('message', function (data, rinfo){
        console.log("data received:" + data.toString());
        dataToProcess = Buffer.concat([dataToProcess, data]);
        var index = utils.indexOfSplitter(dataToProcess);
        while(index > -1) {
            //bson is here
            console.log("receiving size:" + dataToProcess.slice(0, index).length);
            //Process bson

            var jsonData = bson.parse(dataToProcess.slice(0, index));
            //has file content
            if (utils.hasFileIndex(jsonData)) {
                var blockID = jsonData["index"];
                var readStream = fs.createReadStream(
                    source_file, {
                        start: blockID * BLOCK_SIZE,
                        end: blockID * BLOCK_SIZE + BLOCK_SIZE - 1
                    }
                );
                readStream.on('data', function(data) {
                    console.log('transfer data....', blockID);
                    toSend = bson.serialize({header: "media", index: blockID, content: data});
                    toSend = Buffer.concat([toSend, BF_SPLITTER]);
                    console.log("data size:" + data.length + " bson size:" + toSend.length);
                    // 目前看来, 问题就是client没办法接受得那么快, 目前的解决方法就是堆在一起发。
                    // 让client最后向每个server发一个结束信息, server收到结束信息之后把自己剩下的包发出去
                    // client那一边最后应当记录收到的block, 最后检查有哪些没收到, 然后请求这些剩余的块
                    socket.send(toSend, 0, toSend.length, 9999, rinfo.address);
                });

                readStream.on('end', function () {
                    console.log('transfer data end....');
                });
            }
            else{
                    console.log("Waning: bson is not a file content...");
                }
            // Cuts off the processed chunk
            dataToProcess = dataToProcess.slice(index + SPLITTERLENGTH, dataToProcess.length);
            index = utils.indexOfSplitter(dataToProcess);
        }

    });
    socket.on('close', function(){
        connectionCnt--;
        console.log('close....');
    });
    socket.on('error', function(){
        console.log('\033[96m error occur.  \033[39m');
    });
}

/*
setInterval(function(){
    var index = utils.indexOfSplitter(dataToProcess);
    while (index > -1) {
        var jsonData = bson.parse(dataToProcess.slice(0, index));
        if(utils.hasFileIndex(jsonData)) {
            var blockID = jsonData["index"];
            console.log("file index: " + blockID);
            fs.openSync(source_file, "r", function (err, fd) {
                fs.readSync(fd, null, 0, BLOCK_SIZE, blockID * BLOCK_SIZE, function (err, bytesRead, buffer) {
                    console.log('transfer data....');
                    var toSend = bson.serialize({header: "media", index: blockID, content: buffer});
                    console.log("data size:" + data.length + " bson size:" + toSend.length);
                    toSend = Buffer.concat([toSend, BF_SPLITTER]);
                    socket.send(toSend, 0, toSend.length, 9999, rinfo.ip);
                    console.log('transfer data end....');
                });
            });
        }
        else{
                console.log("Waning: bson is not a file content...");
        }
        // Cuts off the processed chunk
        dataToProcess = dataToProcess.slice(index + SPLITTERLENGTH, dataToProcess.length);
        index = utils.indexOfSplitter(dataToProcess);
    }
}, 10);

*/
var server1 = dgram.createSocket('udp4');
var server2 = dgram.createSocket('udp4');
var server3 = dgram.createSocket('udp4');

server1.bind(8801, function () {
    addEventListener(server1);
    console.log('\033[96m   server listening on *:8801\033[39m');
});
server2.bind(8802, function (){
    addEventListener(server2);
    console.log('\033[96m   server listening on *:8802\033[39m');
});
server3.bind(8803, function (){
    addEventListener(server3);
    console.log('\033[96m   server listening on *:8803\033[39m');
});
//
