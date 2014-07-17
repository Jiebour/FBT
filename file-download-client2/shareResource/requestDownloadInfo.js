/**
 * Created by fbt on 14-7-9.
 */

var utils = require('../fbtUtils/fbtUtils');
var http = require('http');
var querystring = require('querystring');

function requestResourceDownloadInfo(fbtHost, fbtPort, uid, file_hash,getResourceDownloadInfoCallback){
    utils.assert(fbtHost.length > 0);
    utils.assert(fbtPort > 0);
    utils.assert(uid >= 0);
    utils.assert(file_hash.length > 0,"file hash length=0:"+file_hash);

    // URL:
    // http://128.199.222.27:8888/download_resource?user=21&file_hash=714371632
    var downloadInfo={'user':uid,
        'file_hash': file_hash};

    var options = {
        hostname: fbtHost,
        port: fbtPort,
        path: '/download_resource?' + querystring.stringify(downloadInfo),
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
                utils.assert("file_info" in json);
                utils.assert("owners" in json);
                //{"owners": [], "file_info": {"file_hash": "714371632", "file_name": "README.txt", "file_size": "3906"}, "err": 0}
                var file_info=json["file_info"];
                file_info["owners"]=json["owners"];
                getResourceDownloadInfoCallback(null,file_info);
            }else{
                global.log.info("json err:",json);
                getResourceDownloadInfoCallback("json format error");
            }
        });
    });

    httpWritingStream.on('error', function requestError(err) {
        //handle error if server not connect
        global.log.info("error in http GET:"+err);
        getResourceDownloadInfoCallback('http request error:'+err);
    });
}

exports.requestResourceDownloadInfo = requestResourceDownloadInfo;