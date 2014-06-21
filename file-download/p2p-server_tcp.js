var socket = require("net"),
    fileSystem = require("fs"),
    bson = require('buffalo'),
    utils = require('./utils'),
    settings = require('./settings');

var BLOCK_SIZE = settings.BLOCK_SIZE,
    SPLITTER = settings.SPLITTER,
    SPLITTERLENGTH = settings.SPLITTERLENGTH,
    source_file = settings.source_file;

var connectionCnt = 0;
var dataToProcess = new Buffer(0);


function handle_conn(connection) {
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
                var readStream = fileSystem.createReadStream(
                    source_file, {
                        start: startHere*BLOCK_SIZE,
                        end: startHere*BLOCK_SIZE+BLOCK_SIZE-1
                    }
                );
                readStream.on('data', function(data) {
                    //connection.setEncoding('binary');
                    console.log('transfer data....');
                    var toSend = bson.serialize({header: "med ia", content: data});
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
            dataToProcess = dataToProcess.slice(index + SPLITTERLENGTH, dataToProcess.length);
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
}

var server1 = socket.createServer(handle_conn);
var server2 = socket.createServer(handle_conn);
var server3 = socket.createServer(handle_conn);

server1.listen(8801, function () {
    console.log('\033[96m   server listening on *:8801\033[39m');
});
server2.listen(8802, function (){
    console.log('\033[96m   server listening on *:8802\033[39m');
});
server3.listen(8803, function (){
    console.log('\033[96m   server listening on *:8803\033[39m');
});
