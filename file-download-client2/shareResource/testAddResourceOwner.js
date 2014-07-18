/**
 *
 * Created by fbt on 14-7-10.
 */

var ResourceOwnerAdder = require('./addResourceOwner.js');
var ResourceUploader = require('./uploadResource.js');
var path = require('path');

//first upload a resource
//then download it
testUploadResource();

function testUploadResource(){
    var fbtHost = '192.168.1.102';
    var fbtPort= 8888;
    var uid=2;
    var fileName='test.txt';
    var filePath=path.join(__dirname, fileName);
    var mainType=1;
    var subType=2;
    var grade=3;
    var comment='%just good%';
    var tags='test hello';
    var isPublic=true;
    var uploadStateCallback=function(err,uploadedFileName){
        if(err) console.log("upload resource info err:"+err);
        else console.log("upload resource info OK:"+uploadedFileName);
        testAddResourceOwner();
    };
    ResourceUploader.uploadResource(fbtHost, fbtPort, uid, fileName, filePath, mainType, subType, grade, comment,tags,isPublic, uploadStateCallback);
}

var hashCode = function(str) {//string hash
      var hash = 0, i, chr, len;
      if (str.length == 0) return hash;
      for (i = 0, len = str.length; i < len; i++) {
        chr   = str.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
      }
      return hash.toString();
    };

function testAddResourceOwner(){
    var fbtHost = '192.168.1.102';
    var fbtPort= 8888;
    var uid=2100;
    var fileHash=hashCode('test.txt');//just a mock
    var addOwnerOKCallback=function(err){
        if(err) console.log("add resource owner err:"+err);
        else console.log("add resource owner OK:"+fileHash);
    };
    ResourceOwnerAdder.addResourceOwner(fbtHost, fbtPort, uid, fileHash,addOwnerOKCallback);
}
