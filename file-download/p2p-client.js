var networkutil=require("./network-util");

var net = require('net');
var fs = require('fs');
var BSON = require('buffalo');

function rand3(){
    //Return a random number between 1 and 3:
    return Math.floor((Math.random() * 3) + 1);
}

var BLOCK_SIZE=1024;
//download file by block 1KB
//fileSize
var fileSize=439355;
var filepath='fav-local.mp3';
for(var i=0;i<(fileSize+1023)/1024;++i){
	downloadFile('127.0.0.1',8800+rand3(),'fav.mp3',filepath,i);
	//downloadFile('127.0.0.1',8801,'fav.mp3',filepath,i);
}

function hasFileContent(jsonData){
    return "content" in jsonData;
}
    
function downloadFile(IP,PORT,remoteFile,localFile,blockID){
    var client = new net.Socket()
    ///client.setEncoding('binary');

    //connect to the server
    client.connect(PORT,IP,function() {
        console.log('Client Connected to server');
        client.write(BSON.serialize({file:"fav.mp3",index: blockID})); //TODO the real file to transfer
        client.write(networkutil.SPLITTER);//END mark
    });

    var stream = fs.createWriteStream(localFile,{start: blockID*BLOCK_SIZE});//,{ flags: 'w',  encoding: 'binary',  mode: 0666 });
    var dataToProcess=new Buffer(0);

    client.on('data', function(data) {
        console.log("receiving data....");
        ////chunks.push(data);
        ///var dataToProcess=Buffer.concat(chunks);
        dataToProcess=Buffer.concat([dataToProcess,data]);
        //greedy
        var index=networkutil.indexOfSplitter(dataToProcess);
        while(index>-1) {
            console.log("receiving size:"+dataToProcess.slice(0, index).length);
            var jsonData=BSON.parse(dataToProcess.slice(0, index));
            //has file content
            if(hasFileContent(jsonData)){
                stream.write(jsonData["content"]);                
            }else{
                console.log("Waning: bson is not a file content...");
            }
            
            dataToProcess=dataToProcess.slice(index+networkutil.SPLITTER.length,dataToProcess.length);// Cuts off the processed chunk
            index=networkutil.indexOfSplitter(dataToProcess);
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
