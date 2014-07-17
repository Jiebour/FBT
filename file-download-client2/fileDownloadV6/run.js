var utils = require('../fbtUtils/fbtUtils');

var httpServer=require('./wrapper.js');
var http=require('http');
var net = require('net');

function start(config){
  if(config && ('fbtHost' in config) && ('fbtPort' in config) && ('fbtUser' in config)){
    getLANIP(function (error, localIP) {
        if (error) {
            global.log.info('get LAN IP error:'+ error);
        }else{
		  if(isPrivateIPV4(localIP)){//if is LAN
			global.log.info('LAN IP:'+localIP);
			httpServer.runAt(localIP,8884,config);//!!!IPv4 local Port for Http server is 8884!!!
		  }
        }
    });
    
    getPublicIP(function (error, publicIP) {
        if (error) {
            global.log.info('get public IP error:'+ error);
        }else{
          global.log.info('public IP:'+publicIP);
          if(isPublicIPV6(publicIP)){
            httpServer.runAt(publicIP,8886,config);//!!!IPv6 Port for Http server is 8886!!!
          }else{
            global.log.info('It is not an public ipv6 address. IP:'+publicIP);
          }
        }
    });
  }else{
    throw Error("Argument error! config should be {'fbtUser': xxx, 'fbtHost': xxx, 'fbtPort': 8888 }");
  }  
  
  function getLANIP(callback) {
    var socket = net.createConnection(config.fbtPort, config.fbtHost);//+'/request_local_ip');
    //var socket = net.createConnection(80, 'nodejs.org');
    socket.on('connect', function() {
      //global.log.info("%j",socket.address());
      //global.log.info("socket.remoteAddress:"+socket.remoteAddress);
      //global.log.info("socket.localAddress:"+socket.localAddress);
      callback(undefined, socket.address().address);//if is extern IP, it will return it. and if it is LAN, return LAN IP
      socket.end();
    });
    socket.on('error', function(e) {
      callback(e);
    });
  }
  
  
  function getPublicIP(callback){
      var options = {
          hostname: config.fbtHost,
          port: config.fbtPort,
          path: '/request_ip',
          method: 'GET',
        };
        var chunks=[];
        http.get(options, function(response) {
          response.on('data', function (chunk) {
            chunks.push(chunk);
          });
        
          response.on('error', function (err) {
            global.log.info('getPublicIP err:'+err);
          });
        
          response.on('close', function () { 
            global.log.info('close ....');
          });
        
          response.on('end', function () { 
            var chunksData=Buffer.concat(chunks);
            var json=JSON.parse(chunksData);
            if('err' in json && json['err']==0){
              callback(undefined,json['ip']);
            }else{
              callback(new Error("error:"+chunksData));
            }
          });
        }).on('error',function requestError(err){
            callback(err)
        });
  }
}


function isPrivateIPV4(addr) {
  return addr.match(/^10\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^192\.168\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^172\.(1[6-9]|2\d|30|31)\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^127\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})/) != null ||
    addr.match(/^169\.254\.([0-9]{1,3})\.([0-9]{1,3})/) != null;
}

function isPublicIPV6(addr) {
    if((/^[Ff][Cc]00:/.test(addr) == false) && (/^[fF][eE]80:/.test(addr) ==false)){//addr is not private ipv6
      return /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/.test(addr);
    }else{
      return false;
    }
}

exports.start = start;

