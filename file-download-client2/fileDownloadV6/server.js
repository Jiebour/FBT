var http = require("http");
var url = require("url");
var querystring = require('querystring');

function start(route, handle, host, port, config) {
  function onRequest(request, response) {
    var pathname = url.parse(request.url).pathname;
    global.log.info("Request for " + request.url + " received.");
    route(handle, pathname, response, request);
  }

  var server=http.createServer(onRequest);
  server.listen(port, host);
  server.on('listening', function (err) {
      global.log.info("Http server has started for host==>"+host+" port==>"+port);

      var options = {
        hostname: config['fbtHost'],
        port: config['fbtPort'],
        path: '/report_http_server_info?'+querystring.stringify({ip:host, port: port, user: config['fbtUser']}),
        method: 'GET',
      };
      var chunks=[];
      http.get(options, function(response) {
        response.on('data', function (chunk) {
          chunks.push(chunk);
        });
      
        response.on('error', function (err) {
          global.log.info('report_http_server_info err:'+err);
        });
      
        response.on('close', function () { 
          global.log.info('close ....');
        });
      
        response.on('end', function () { 
          var chunksData=Buffer.concat(chunks);
          var json=JSON.parse(chunksData);
          if('err' in json && json['err']==0){
            global.log.info("upload http server ip and host to server. host:"+host+" port:"+port);
          }else{
            throw new Error("report_http_server_info, host:"+options.hostname+" port:"+options.port +" err:"+chunksData);//TODO FIXME
          }
        });
      }).on('error',function requestError(err){
          throw new Error("report_http_server_info, host:"+options.hostname+" port:"+options.port +" err:"+err);//TODO FIXME
      });
  });
  server.on('error', function (err) {
      if (err.code == 'EADDRINUSE') {
        global.log.info('Address in use, retrying...');
        setTimeout(function () {
          server.listen(port, host);
        }, 10000); //retry to bound address for every 10 seconds
      } else{
        global.log.info('unknown http listen err:'+err);
      }
  });
}

exports.start = start;
