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
    //connection.setEncoding('binary');
    ////connection.write(welcome());

    //TODO
    //add IP and user ID dection here

    connectionCnt++;
    connection.on('data', function (data){
        console.log("data received:"+data);
//        if(!nickname) {//sending msg is username
//            if(users[data]) {
//                connection.write('\033[93m > nickname already in use. Try again:\033[39m ');
//                return;
//            } else {
//                nickname = data;
//                users[nickname] = connection;
//    
//                for(var i in users) {
//                    users[i].write('\033[90m > ' + nickname + ' joined the room\033[39m\n');
//                }
//            }
//        } else {//sending msg is normal chat message
//            for(var i in users) {
//                if(i != nickname) {
//                    users[i].write('\033[96m > ' + nickname + ':\033[39m ' + data + '\n');
//                }
//            }
//        }

        ///var dataToProcess=Buffer.concat(chunks);
        dataToProcess=Buffer.concat([dataToProcess,data]);
        //greedy
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
        //delete users[nickname];
        //connection.write('\033[90 > ' + nickname + ' left the room\033[39m\n');
        //Object.keys(users).forEach(function (user) {
        //users[user].write(nickname + ' left the room');
        //});
    });
    connection.on('error', function(){
        console.log('\033[96m error occur.  \033[39m');
    }
    );
});

server.listen(8802, function (){
    console.log('\033[96m   server listening on *:8802\033[39m');
});
