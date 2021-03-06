var dgram = require("dgram"),
    fs = require("fs"),
    bson = require('buffalo'),
    utils = require('./utils'),
    settings = require('./settings');

var BLOCK_SIZE = settings.BLOCK_SIZE,
    source_file = settings.source_file;


function addEventListener(socket) {
    var toSend = new Buffer(0);
    socket.on('message', function (data, rinfo){
//        console.log("data received:" + data.toString());

            //bson is here
//            console.log("receiving size:" + dataToProcess.slice(0, index).length);
            //Process bson

        var jsonData = bson.parse(data);
        //has file content
        if (utils.hasFileIndex(jsonData)) {
            var blockID = jsonData["index"];
            var readStream = fs.createReadStream(
                source_file, {
                    start: blockID * BLOCK_SIZE,
                    end: blockID * BLOCK_SIZE + BLOCK_SIZE - 1,
                    autoClose: true
                }
            );
            readStream.on('data', function(data) {
                console.log('transfer data....', blockID);
                toSend = bson.serialize({
                    header: "media",
                    index: blockID,
                    content: data,
                    checksum: utils.get_checksum(data)
                });
//                    console.log("data size:" + data.length + " bson size:" + toSend.length);
                // 让client最后向每个server发一个结束信息, server收到结束信息之后把自己剩下的包发出去
                // client那一边最后应当记录收到的block, 最后检查有哪些没收到, 然后请求这些剩余的块
                socket.send(toSend, 0, toSend.length, rinfo.port, rinfo.address);
            });

            readStream.on('end', function () {
//                    console.log('transfer data end....');
            });
        }
        else{
            console.log("Waning: bson is not a file content...");
        }
    });
    socket.on('close', function(){
        console.log('close....');
    });
    socket.on('error', function(){
        console.log('\033[96m error occur.  \033[39m');
    });
}

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
