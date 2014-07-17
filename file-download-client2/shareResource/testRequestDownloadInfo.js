/**
 *
 * Created by fbt on 14-7-10.
 */

var ResourceDownloadInfo = require('./requestDownloadInfo.js');

testRequestDownloadInfo();

function testRequestDownloadInfo(){
    var fbtHost = '128.199.222.27';
    var fbtPort= 8888;
    var uid=21;
    var file_hash='-1425779317';
    var getDownloadInfoCallback=function(err,file_info){
        if(err) console.log("get resource download info err:"+err);
        else console.log("get resource download info OK:%j",file_info);
    };
    ResourceDownloadInfo.requestResourceDownloadInfo(fbtHost, fbtPort, uid, file_hash,getDownloadInfoCallback);
}
