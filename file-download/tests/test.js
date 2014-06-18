var child_process = require("child_process"),
    xxhash = require('xxhash'),
    fs = require('fs'),
    settings = require('../settings');


child_process.spawn('node', ["p2p-server_tcp.js"]).stdout.on('data', function(data){
   console.log(data.toString());
});
child_process.spawn('node', ["p2p-client_tcp.js"]).stdout.on('data', function(data){
    console.log(data.toString());
});

setTimeout(function(){
    console.log(xxhash.hash(fs.readFileSync(settings.source_file), 0xAAAA));
    console.log(xxhash.hash(fs.readFileSync(settings.download_file), 0xAAAA));
}, 4000);
