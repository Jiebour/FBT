/*
暂时不要用test.js进行测试, 还是先运行p2p-server.js再运行p2p-client.js
 */

var child_process = require("child_process"),
    xxhash = require('xxhash'),
    fs = require('fs'),
    settings = require('../settings');


child_process.spawn('node', ["p2p-server.js"]).stdout.on('data', function(data){
   console.log(data.toString());
});
setTimeout(function(){
    child_process.spawn('node', ["p2p-client.js"]).stdout.on('data', function(data){
        console.log(data.toString());
    });
}, 2000); // give server some time to start

setTimeout(function(){
    console.log(xxhash.hash(fs.readFileSync(settings.source_file), 0xAAAA));
    console.log(xxhash.hash(fs.readFileSync(settings.download_file), 0xAAAA));
}, 10000);
