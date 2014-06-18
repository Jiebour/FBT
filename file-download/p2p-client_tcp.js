var net = require('net'),
    fs = require('fs'),
    randomAccessFile = require('random-access-file'),
    BSON = require('buffalo'),
    utils = require('./utils'),
    settings = require('./settings');


var BLOCK_SIZE = settings.BLOCK_SIZE,
    SPLITTER = settings.SPLITTER,
    SPLITTERLENGTH = settings.SPLITTERLENGTH,
    source_file = settings.source_file,
    download_file = settings.download_file,
    filesize = settings.filesize;


for(var i=0; i<(filesize+BLOCK_SIZE-1)/BLOCK_SIZE; ++i){
	downloadFile('127.0.0.1', 8800+utils.rand3(), source_file, download_file, i);
}


function downloadFile(IP, PORT, remoteFile, localFile, blockID){
    var client = new net.Socket();
    ///client.setEncoding('binary');

    //connect to the server
    client.connect(PORT, IP, function() {
        console.log('Client Connected to server');
        client.write(BSON.serialize({file: source_file, index: blockID}));
        //TODO the real file to transfer
        client.write(SPLITTER); //END mark
    });

    var dataToProcess = new Buffer(0);

    client.on('data', function(data) {
        console.log("receiving data....");
        dataToProcess = Buffer.concat([dataToProcess, data]);
        var index = utils.indexOfSplitter(dataToProcess);
        while(index>-1) {
            console.log("receiving size:" + dataToProcess.slice(0, index).length);
            var jsonData = BSON.parse(dataToProcess.slice(0, index));
            //has file content
            if(utils.hasFileContent(jsonData)){
                var chunksData = jsonData["content"];
                var file = randomAccessFile(localFile);
                file.write(blockID*BLOCK_SIZE, chunksData, function (err) {
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
