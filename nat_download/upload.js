var dgram = require("dgram"),
    fs = require("fs"),
    bson = require('buffalo'),
    utils = require('./utils'),
    settings = require('./settings');

var BLOCK_SIZE = settings.BLOCK_SIZE,
    source_file = settings.source_file; // TODO: how to know source_file


function addEventListener(socket) {
    var toSend = new Buffer(0);
    socket.on('message', function (data, rinfo){
        var jsonData = bson.parse(data);
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
                toSend = bson.serialize({header: "media", index: blockID, content: data});
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

function main(socket){
    // 直接使用之前punch时的socket, 废除之前punching用的处理, 添加新处理
    socket.removeAllListeners("message");
    addEventListener(server1);
    console.log("uploader listening on " + socket.address().port);
    console.log("prepare to upload");
}




