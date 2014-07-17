/**
 *
 * Created by fbt on 14-7-10.
 */

var ResourceUploader = require('./uploadResource.js');
var path = require('path');

testUploadResource();

function testUploadResource(){
    var fbtHost = '192.168.1.106';
    var fbtPort= 8888;
    var uid=2;
    //var fileName='hello.txt';
    var fileName='gen-qlib.bin.tar.gz';
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
    };
    ResourceUploader.uploadResource(fbtHost, fbtPort, uid, fileName, filePath, mainType, subType, grade, comment,tags,isPublic, uploadStateCallback);
}
