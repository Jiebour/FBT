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

var SPLITTER='@@@@@';

function newIndex(buffer) {
    var i = 0;
    while(i < (buffer.length - 4)){
        console.log(typeof(buffer.slice(i, i+5)));
        console.log(typeof(Buffer("@@@@@")));
        if(buffer.slice(i, i+5).toString() == SPLITTER) {
            return i;
        }
        i += 1;
    }
    return -1;
}

function test() {
    var s = Buffer("dasdad@@@@@dsdsd");
    console.log(indexOfSplitter(s));
    console.log(newIndex(s));
}

test();

