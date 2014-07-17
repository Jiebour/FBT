var nat_client = require("./nat-client.js"),
    settings = require("./settings.js"),
    BSON = require('buffalo'),
    utils = require('./utils'),
    fs = require('fs');

var NATTYPE = settings.NATTYPE,
    BLOCK_SIZE = settings.BLOCK_SIZE,
    BLOCK_IN_PART = settings.BLOCK_IN_PART,
    partsize = settings.partsize;


function check_debug_input() { // only apply in DEBUG mode
    var argv = process.argv.slice(1);// 去掉'node'就和py相同了
    var test_nat_type = null;
    if (argv.length !== 2 && argv.length !== 1) {
        console.log("usage: node main_uploader.js [test_nat_type]"); // 仅供测试
        process.exit(1);
    }
    if (argv.length === 2) {
        test_nat_type = parseInt(argv[1]);  // test_nat_type is int
        if ([0, 1, 2, 3].indexOf(test_nat_type) === -1) {
            console.log("test nat type should be [0,1,2,3]")
        }
    }
    return test_nat_type;
}


function addEventListener(socket, source_file) {
    socket.on('message', function (data, rinfo){
        var jsonData = BSON.parse(data);
        if (utils.hasFileIndex(jsonData)) {
            var blockID = jsonData["index"];
            var readStream = fs.createReadStream(
                source_file, {
                    start: blockID * BLOCK_SIZE,
                    end: blockID * BLOCK_SIZE + BLOCK_SIZE - 1,
                    autoClose: true
                }
            );
            readStream.on('data', function(data) {
                console.log('transfer data....', blockID);
                var toSend = BSON.serialize({
                    header: "media",
                    index: blockID,
                    content: data,
                    checksum: utils.get_checksum(data)
                });
                socket.send(toSend, 0, toSend.length, rinfo.port, rinfo.address);
            });

            readStream.on('end', function () {
                console.log('transfer data end....');
            });
        }
        else{
            console.log("Waning: BSON is not a file content...");
        }
    });
    socket.on('close', function(){
        console.log('close....');
    });
    socket.on('error', function(){
        console.log('\033[96m error occur.  \033[39m');
    });
}


function create_download_client(test_nat_type, pool, client_id) {

    // NAT type detection
    if (test_nat_type === null) {
        var python = require('child_process').spawn(settings.stun_exe);
        python.stdout.on('data', function(data) {
            var nat_type = data.toString().split(',')[1]; //[space]'Full Cone')
            nat_type = nat_type.slice(2, nat_type.length - 4);
            var nat_type_id = NATTYPE.indexOf(nat_type);
            console.log(nat_type);
            if (nat_type_id !== -1){
                var client = new nat_client.Client(nat_type, pool);
                client.request_for_connection(nat_type_id, client);
                if (typeof(global.upload_clients) === "undefined") {
                    global.upload_clients = {};
                }
                global.upload_clients[client_id] = client;
            }
            else {
                // TODO: 如果不是这四种NAT类型, 如何处理?
            }
        });
    }
    else { // test mode
        var client = new nat_client.Client(NATTYPE[test_nat_type], pool);
        client.request_for_connection(test_nat_type, client);
        if (typeof(global.upload_clients) === "undefined") {
            global.upload_clients = {};
        }
        global.upload_clients[client_id] = client;
    }
};


function upload_main(source_file, uid, hash){
    global.nat_server_ip = "127.0.0.1"; // local test
//        global.nat_server_ip = "205.147.105.205"; // 用现有的VPS作测试
    global.nat_server_port = 10000;
    var test_nat_type = null;
    if (settings.DEBUG)
        test_nat_type = check_debug_input();

    global.traverse_complete_count = 0 // 完成穿透的socket计数, 和is_available同时更新
    var pool = uid.toString() + ':' + hash.toString();

    // 因为会开多个upload_client, 所以要记录
    var client_id;
    if (typeof(global.upload_client_count) !== "undefined")
        client_id = global.upload_client_count + 1;
    else {
        global.upload_client_count = 1;
        client_id = 1;
    }
    create_download_client(test_nat_type, pool, client_id);

    var interval_obj = setInterval(function(){
        if (global.traverse_complete_count === 1) {
            clearInterval(interval_obj);
            var socket = global.upload_clients[client_id].socket;
            socket.removeAllListeners("message");
            addEventListener(socket, source_file);
            console.log("uploader listening on " + socket.address().port);
            console.log("prepare to upload");
        }
    }, 500);
}

if (settings.DEBUG) {
    upload_main('test.mp4', 1, 2450791387);
}



