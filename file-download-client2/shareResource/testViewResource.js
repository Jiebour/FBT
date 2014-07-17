/**
 *
 * Created by fbt on 14-7-10.
 */

var ResourceViewer = require('./viewResource.js');

testViewResource();

function testViewResource(){
    var fbtHost = '192.168.1.106';
    var fbtPort= 8888;
    var getResListCallback=function(err,resourceList){
        if(err) console.log("get resource list err:"+err);
        else console.log("get resource list OK:%j",resourceList);
    };
    ResourceViewer.requestResourceList(fbtHost, fbtPort,getResListCallback);
}
