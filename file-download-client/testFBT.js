var resourceShare=require('./shareResource/uploadResource.js');
console.log("DB:%j",resourceShare.resourceDB);
var httpServer=require('./fileDownloadV6/run.js');
httpServer.start({fbtHost: '192.168.1.101', fbtPort: 8888, fbtUser: 'bone', resourceDB: resourceShare.resourceDB}); 
