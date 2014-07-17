// debug assert
var assert = function(condition, message) { 
    if (!condition)
        throw Error("Assert failed" + (typeof message !== "undefined" ? ": " + message : ""));
};


//python range
function range(lowEnd,highEnd){
	var arr = [];
	while(lowEnd < highEnd){
	   arr.push(lowEnd++);
	}
	return arr;
}

//remove element item in array arr
function removeArrayItem(arr, item) {
    var removeCounter = 0;

    for (var index = 0; index < arr.length; index++) {
        if (arr[index] === item) {
            arr.splice(index, 1);
            removeCounter++;
            index--;
        }
    }

    return removeCounter;
}


//rangdom choose item in array items
function randomChoose(items){
	return items[Math.floor(Math.random()*items.length)];
}

//if an array is empty
function isEmpty(arr){
	return arr.length==0;
}

function first(arr){
	assert(!isEmpty(arr));
	return arr[0];
}

//length of array
function len(arr){
	return arr.length;
}

function length_of_hash(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
}

// Get the size of an object
//var size = Object.size(myArray);

//if a var is defined
//function defined(variable){
//	return typeof(variable) !== 'undefined';
//}

function isFunction(f){
	return typeof(f)==='function';
}

global.logOpened=0;
if(!global.logOpened){
    var Log = require('log');
    global.log = new Log('debug', require('fs').createWriteStream(require('path').join(__dirname,'fbt.log')));
    global.logOpened=1;
}

function getUserHome() {
  return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
}

exports.assert=assert;
exports.range=range;
exports.removeArrayItem=removeArrayItem;
exports.randomChoose=randomChoose;
exports.isEmpty=isEmpty;
exports.len=len;
exports.first=first;
exports.isFunction=isFunction;
exports.length_of_hash=length_of_hash;
exports.getUserHome=getUserHome;
//exports.log=log;
