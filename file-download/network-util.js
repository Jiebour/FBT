var SPLITTER='@@@@@';

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
    
exports.indexOfSplitter=indexOfSplitter;
exports.SPLITTER=SPLITTER;
