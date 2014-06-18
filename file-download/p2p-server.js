var socket = require("net"),
    fileSystem = require("fs"),
    bson = require('buffalo'),
    utils = require('./utils');


var SPLITTER = '@@@@@';
var connectionCnt = 0;
var dataToProcess = new Buffer(0);

var server = socket.createServer(function (connection){
    connectionCnt++;
    connection.on('data', function (data){
        console.log("data received:" + data);
        dataToProcess = Buffer.concat([dataToProcess,data]);
        var index = utils.indexOfSplitter(dataToProcess);
        while(index > -1) {
            //bson is here
            console.log("receiving size:"+dataToProcess.slice(0, index).length);
            //Process bson
            
            var jsonData = bson.parse(dataToProcess.slice(0, index));
            //has file content
            if(utils.hasFileIndex(jsonData)){
                var startHere = jsonData["index"];
                console.log("file index:" + startHere);
                var BLOCK_SIZE = 1024;
                var readStream = fileSystem.createReadStream(
                    'fav.mp3', {
                        start: startHere*BLOCK_SIZE,
                        end: startHere*BLOCK_SIZE+BLOCK_SIZE-1
                    }
                );
                readStream.on('data', function(data) {
                    //connection.setEncoding('binary');
                    console.log('transfer data....');
                    var toSend = bson.serialize({header: "media",content: data});
                    console.log("data size:" + data.length + " bson size:" + toSend.length);
                    connection.write(toSend);
                    connection.write(SPLITTER);
                });
                
                readStream.on('end', function() {
                    console.log('transfer data end....');
                    connection.end();
                });                
            }else{
                console.log("Waning: bson is not a file content...");
            }

            // Cuts off the processed chunk
            dataToProcess = dataToProcess.slice(index + SPLITTER.length,dataToProcess.length);
            index = utils.indexOfSplitter(dataToProcess);
        }        
    });
    connection.on('close', function(){
        connectionCnt--;
        console.log('close....');
    });
    connection.on('error', function(){
        console.log('\033[96m error occur.  \033[39m');
    });
});

server.listen(8801, function (){
    console.log('\033[96m   server listening on *:8801\033[39m');
});
