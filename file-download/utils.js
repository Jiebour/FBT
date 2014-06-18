buffertools = require("buffertools");

var SPLITTER = '@@@@@';
function indexOfSplitter(buffer){
    for(var i=0; i < (buffer.length - 4); i++)
        if(buffertools.compare(buffer.slice(i, i+5), SPLITTER) == 0)
            return i;
    return -1;
}


function hasFileContent(jsonData){
    return "content" in jsonData;
}


function hasFileIndex(jsonData){
    return "index" in jsonData;
}


function rand3(){
    //Return a random number between 1 and 3:
    return Math.floor((Math.random() * 3) + 1);
}


exports.indexOfSplitter = indexOfSplitter;
exports.hasFileContent = hasFileContent;
exports.hasFileIndex = hasFileIndex;
exports.rand3 = rand3;