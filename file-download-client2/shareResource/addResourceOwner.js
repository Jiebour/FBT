/**
 * Created by fbt on 14-7-9.
 */

var utils = require('../fbtUtils/fbtUtils');
var http = require('http');
var querystring = require('querystring');

function addResourceOwner(fbtHost, fbtPort, uid, fileHash, callback){
    utils.assert(fbtHost.length > 0);
    utils.assert(fbtPort > 0);
    utils.assert(uid >= 0);
    utils.assert(fileHash.length > 0,"file hash length=0:"+fileHash);

    // URL:
    // http://128.199.222.27:8888/download_over?user=21&file_hash=714371632
    var queryInfo={'user':uid,
        'file_hash': fileHash};

    var options = {
        hostname: fbtHost,
        port: fbtPort,
        path: '/download_over?' + querystring.stringify(queryInfo),
        method: 'GET'
    };

    var chunks = [];
    var httpWritingStream = http.get(options, function (response) {
        response.on('data', function (chunk) {
            chunks.push(chunk);
        });

        var errorOccur = 0;
        response.on('error', function (err) {
            errorOccur = 1;
        });

        response.on('close', function () {// event emit when the server has stopped! may not follow with end event!
            if (errorOccur) {
                getResourceDownloadInfoCallback("error in GET http method");
            }
        });

        response.on('end', function () {// event emit when all data has come out!
            var chunksData = Buffer.concat(chunks);
            var json=JSON.parse(chunksData);
            if('err' in json && json['err']==0){
                //{"owners": [], "file_info": {"file_hash": "714371632", "file_name": "README.txt", "file_size": "3906"}, "err": 0}
                global.log.info("add an owner ok file hash:"+fileHash+" owner:"+uid);
                if(callback){
                    callback(null);
                }
            }else{
                if(callback){
                    callback("json err:"+json);
                }
                global.log.info("json err:",json);
            }
        });
    });

    httpWritingStream.on('error', function requestError(err) {
        //handle error if server not connect
        if(callback){
            callback("http err:"+err);
        }
        global.log.info("error in http GET:"+err);
    });
}

exports.addResourceOwner = addResourceOwner;