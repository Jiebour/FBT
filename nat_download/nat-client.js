var dgram = require("dgram");
var utils = require("./utils.js");
var settings = require("./settings");

var FullCone = settings.FullCone,  // 0
    RestrictNAT = settings.RestrictNAT,  // 1
    RestrictPortNAT = settings.RestrictNAT,  // 2
    SymmetricNAT = settings.SymmetricNAT;  // 3
var NATTYPE = [FullCone, RestrictNAT, RestrictPortNAT, SymmetricNAT];


function Client(nat_type, pool) {
	var master_ip = settings.nat_server_ip;
	var master = {ip: master_ip, port: settings.nat_server_port};
	var pool = pool;
	var socket = null;
    var target = null; // 对面client
	var peer_nat_type = null;
    var nat_type = nat_type;
    var is_available; // 这个socket是否可用

	this.request_for_connection = function (nat_type_id) {
		socket = dgram.createSocket("udp4");
		var msg = new Buffer(pool + ' ' + nat_type_id);  // msg是Buffer
        socket.send(msg, 0, msg.length, master.port, master.ip);
        var sendmsg = new Buffer('ok');
        var message;

        var messageforconnect = function(msg, rinfo) {
            /*本来是用switch, 但是不知道为什么就是有bug,只能转用多个条件判断*/
            message = msg.toString();
            console.log(message);
            if (message == "ok " + pool) {
                socket.send(sendmsg, 0, 2, master.port, master.ip);
                console.log("request sent, waiting for partner in pool %s...", pool);
            } else if (msg.length == 7) {
                var result = utils.bytes2addr(msg);
                target = {ip: result[0], port: result[1]};
                peer_nat_type = NATTYPE[result[2]];
                console.log("connected to %s:%s, its NAT type is %s",
                            result[0], result[1], peer_nat_type);
                socket.removeListener('message', messageforconnect);
                chat(nat_type);
            } else {
                console.log("pool %d Got invalid response: ", pool, msg);
                socket.close(); // 这个socket废了
            }
        };
		socket.on('message', messageforconnect);
	};

    var chat = function(nat_type){
        if ((nat_type == SymmetricNAT || peer_nat_type == SymmetricNAT) ||
            (nat_type == SymmetricNAT || peer_nat_type == RestrictPortNAT) ||
            (nat_type == RestrictPortNAT || peer_nat_type == SymmetricNAT))
        {
            /*
            无法处理的情况: 1. 都是sym; 2. 一边是sym,一边是端口受限
            这种情况就不下载了
             */
            is_available = false;
            console.log("Can't download from socket " + pool);
        }
        else if (nat_type == SymmetricNAT || nat_type == RestrictNAT || nat_type == RestrictPortNAT) {
            // 得由symmtric这边发punching包
            is_available = true;
            console.log("Punching mode");
            chat_restrict();
        }
        else if (nat_type == FullCone) {
            is_available = true;
            console.log("FullCone mode");
            chat_fullcone();
        }
        else {
            is_available = false;
            console.log("NAT type wrong!");
        }
    };

    var chat_fullcone = function() {
        process.stdin.on('data', function(text) {
            var text = new Buffer(text);  //奇怪的是单独测试时不需要转成buffer?
            socket.send(text, 0, text.length, target.port, target.ip);
        });
        socket.on('message', function(msg, rinfo) {
            var msg = msg.toString('utf8');
            process.stdout.write("peer: " + msg);
            if (msg == 'punching...\n') {
                var text = new Buffer("end punching\n");
                // 收到punching包, 得回给rinfo.port, 因为若对方是sym, 那rinfo.port!=target.port
                socket.send(text, 0, text.length, rinfo.port, target.ip);
                target.port = rinfo.port;
                global.traverse_complete_count++; // 这个socket穿透完成
            }
        });
    };

    var chat_restrict = function() {
        var periodic_running = true;
        function send(count) {
            var text = new Buffer("punching...\n");
            socket.send(text, 0, text.length, target.port, target.ip);
            console.log("UDP punching package %d sent", count);
            setTimeout(function(){
                if (periodic_running)
                    send(count+1);
            }, 500);
        }
        send(0);
        socket.on('message', function(msg, rinfo) {
            if (periodic_running) {
                console.log("periodic_send is alive");
                periodic_running = false;
                global.traverse_complete_count++; // 这个socket穿透完成
                process.stdin.on('data', function(text) {
                    var text = new Buffer(text);
                    socket.send(text, 0, text.length, target.port, target.ip);
                });
            }
            var msg = msg.toString('utf8');
            process.stdout.write("peer: " + msg);
            if (msg == 'punching...\n') {
                var text = new Buffer("end punching\n");
                socket.send(text, 0, text.length, rinfo.port, target.ip);
                target.port = rinfo.port;
            }
        });
    };
}


exports.Client = Client;

