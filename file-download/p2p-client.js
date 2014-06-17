var net = require('net');
var fs = require('fs');
var randomAccessFile = require('random-access-file');
var BSON = require('buffalo');

function rand3(){
    //Return a random number between 1 and 3:
    return Math.floor((Math.random() * 3) + 1);
}


var SPLITTER='@@@@@';
var BLOCK_SIZE=1024;
//download file by block 1KB
var fileSize = 439355;
var filepath = 'fav-local.mp3';
for(var i=0; i<(fileSize+1023)/1024; ++i){
	downloadFile('127.0.0.1', 8800+rand3(), 'fav.mp3', filepath, i);
}

function indexOfSplitter(buffer){
    var i = 0;
    while(i < (buffer.length - 4)){
        if(buffer[i]==0x40 && buffer[i+1]==0x40 && buffer[i+2]==0x40 && buffer[i+3]==0x40  && buffer[i+4]==0x40){
            return i;
        }
        i += 1;
    }
    return -1;
}

function hasFileContent(jsonData){
    return "content" in jsonData;
}
    
function downloadFile(IP, PORT, remoteFile, localFile, blockID){
    var client = new net.Socket();
    ///client.setEncoding('binary');

    //connect to the server
    client.connect(PORT, IP, function() {
        console.log('Client Connected to server');
        client.write(BSON.serialize({file: "fav.mp3", index: blockID})); //TODO the real file to transfer
        client.write(SPLITTER);//END mark
    });

    var dataToProcess = new Buffer(0);

    client.on('data', function(data) {
        console.log("receiving data....");
        dataToProcess = Buffer.concat([dataToProcess, data]);
        var index = indexOfSplitter(dataToProcess);
        while(index>-1) {
            console.log("receiving size:" + dataToProcess.slice(0, index).length);
            var jsonData = BSON.parse(dataToProcess.slice(0, index));
            //has file content
            if(hasFileContent(jsonData)){
                var chunksData = jsonData["content"];
                var file = randomAccessFile(localFile);
                file.write(blockID*BLOCK_SIZE, chunksData,
                  function writeToFile(err) {
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
            dataToProcess = dataToProcess.slice(index+SPLITTER.length, dataToProcess.length);
            index = indexOfSplitter(dataToProcess);
        } 
    });

    //handle closed
    client.on('close', function() {
        console.log('OK! server closed connection')
    });

    client.on('error', function(err) {
        console.log(err);
    });
}
