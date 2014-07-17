/**
 * Created by fbt on 14-7-9.
 */

var utils = require('../fbtUtils/fbtUtils');
var http = require('http');
var querystring = require('querystring');

function requestResourceList(fbtHost, fbtPort, getResListCallback){
    utils.assert(fbtHost.length > 0);
    utils.assert(fbtPort > 0);

    // URL:
    // http://localhost:8888//view_resource

    var options = {
        hostname: fbtHost,
        port: fbtPort,
        path: '/view_resource',
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
                getResListCallback("error in GET http method");
            }
        });

        response.on('end', function () {// event emit when all data has come out!
            var chunksData = Buffer.concat(chunks);
            var json=JSON.parse(chunksData);
            if('err' in json && json['err']==0){
                utils.assert("resource_list" in json);
                getResListCallback(null,json["resource_list"]);
            }else{
                global.log.info("json err:",json);
                getResListCallback("json format error");
            }
        });
    });

    httpWritingStream.on('error', function requestError(err) {
        //handle error if server not connect
        global.log.info("error in http GET:"+err);
        getResListCallback('http request error:'+err);
    });
}

exports.requestResourceList = requestResourceList;