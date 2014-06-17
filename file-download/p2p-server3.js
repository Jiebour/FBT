var socket = require("net");
var fileSystem = require("fs");
var bson = require('buffalo');


function indexOfSplitter(buffer){
    var i=0,NOT_FOUND=-1;
    while(i<(buffer.length-4)){
        if(buffer[i]==0x40 && buffer[i+1]==0x40 && buffer[i+2]==0x40 && buffer[i+3]==0x40  && buffer[i+4]==0x40){
            return i;
        }
        i+=1;
    }
    return NOT_FOUND;
}
    
function hasFileIndex(jsonData){
    return "index" in jsonData;
}
    
var SPLITTER='@@@@@';
var connectionCnt = 0, users = {};
var dataToProcess=new Buffer(0);

var server = socket.createServer(function (connection){
    var nickname;

    connectionCnt++;
    connection.on('data', function (data){
        console.log("data received:"+data);
        dataToProcess=Buffer.concat([dataToProcess,data]);
        var index=indexOfSplitter(dataToProcess);
        while(index>-1) {
            //bson is here
            console.log("receiving size:"+dataToProcess.slice(0, index).length);
            //Process bson
            
            var jsonData=bson.parse(dataToProcess.slice(0, index));
            //has file content
            if(hasFileIndex(jsonData)){
                var startHere=jsonData["index"];
                console.log("file index:"+startHere);
                var BLOCK_SIZE=1024;
                var readStream = fileSystem.createReadStream('fav.mp3',{start: startHere*BLOCK_SIZE, end:startHere*BLOCK_SIZE+BLOCK_SIZE-1});
                readStream.on('data', function(data) {
                    //connection.setEncoding('binary');
                    console.log('transfer data....');
                    var toSend=bson.serialize({header:"media",content:data});
                    console.log("data size:"+data.length+" bson size:"+toSend.length);
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
            
            dataToProcess=dataToProcess.slice(index+SPLITTER.length,dataToProcess.length);// Cuts off the processed chunk
            index=indexOfSplitter(dataToProcess);
        }        
    });
    connection.on('close', function(){
        connectionCnt--;
        console.log('close....');
    });
    connection.on('error', function(){
        console.log('\033[96m error occur.  \033[39m');
    }
    );
});

server.listen(8803, function (){
    console.log('\033[96m   server listening on *:8803\033[39m');
});
