var dgram = require("dgram");
var utils = require("./utils.js");
var settings = require("./settings");

var FullCone = settings.FullCone,  // 0
    RestrictNAT = settings.RestrictNAT,  // 1
    RestrictPortNAT = settings.RestrictNAT,  // 2
    SymmetricNAT = settings.SymmetricNAT;  // 3
var NATTYPE = [FullCone, RestrictNAT, RestrictPortNAT, SymmetricNAT];


function Client(nat_type, pool) { // nat_type, pool are both string
	var master_ip = settings.nat_server_ip;
	var master = {ip: master_ip, port: settings.nat_server_port};
	var socket = null;
    var target = null; // 对面client
	var peer_nat_type = null;
    var is_available = false; // 这个socket是否可用

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
            if (message === "ok " + pool) {
                socket.send(sendmsg, 0, 2, master.port, master.ip);
                console.log("request sent, waiting for partner in pool %s...", pool);
            } else if (msg.length === 7) {
                var result = utils.bytes2addr(msg);
                target = {ip: result[0], port: result[1]};
                peer_nat_type = NATTYPE[result[2]];
                console.log("connected to %s:%s, its NAT type is %s",
                            result[0], result[1], peer_nat_type);
                socket.removeListener('message', messageforconnect);
                punch(nat_type);
            } else {
                console.log("pool %d Got invalid response: ", pool, msg);
                socket.close(); // 这个socket废了
            }
        };
		socket.on('message', messageforconnect);
	};

    var punch = function(nat_type){
        if ((nat_type === SymmetricNAT || peer_nat_type === SymmetricNAT) ||
            (nat_type === SymmetricNAT || peer_nat_type === RestrictPortNAT) ||
            (nat_type === RestrictPortNAT || peer_nat_type === SymmetricNAT))
        {
            /*
            无法处理的情况: 1. 都是sym; 2. 一边是sym,一边是端口受限
            这种情况就不下载了
             */
            console.log("Can't download from socket " + pool);
        }
        else if (nat_type === SymmetricNAT || nat_type === RestrictNAT || nat_type === RestrictPortNAT) {
            console.log("Punching mode"); // 由这边发punching包
            punch_send();
        }
        else if (nat_type === FullCone) {
            if (peer_nat_type === FullCone) { // 两边都是fullcone, socket直接可用
                is_available = true;
                global.traverse_complete_count++; // socket穿透完成, 如果是uploader, 那这个值达到1就OK了
                console.log("FullCone mode");
            }
            else { // 对面client是受限或者sym, 这时要接收punching包
                console.log("Receive Punching mode");
                punch_receive();
            }
        }
        else {
            console.log("NAT type wrong!");
        }
    };

    var punch_receive = function() {
        socket.on('message', function(msg, rinfo) {
            var msg = msg.toString('utf8');
            process.stdout.write("peer: " + msg);
            if (msg === 'punching...\n') {
                var text = new Buffer("end punching\n");
                // 收到punching包, 得回给rinfo.port, 因为若对方是sym, 那rinfo.port!=target.port
                socket.send(text, 0, text.length, rinfo.port, target.ip);
                target.port = rinfo.port;
            }
            if (msg === "done\n") {
                global.traverse_complete_count++; // 三次握手, socket穿透完成
                is_available = true;
            }
        });
    };

    var punch_send = function() {
        var periodic_running = true;
        function send(count) {
            var text = Buffer("punching...\n");
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
                // 这里收到的应该是"end punching\n"
                // 发出了的包有回应, 说明穿透成功
                console.log("punching succeed");
                periodic_running = false;
                var text = Buffer("done\n");
                socket.send(text, 0, text.length, rinfo.port, target.ip);
                global.traverse_complete_count++;
                is_available = true;
            }
            var msg = msg.toString('utf8');
            process.stdout.write("peer: " + msg);
            if (msg === 'punching...\n') {
                var text = Buffer("end punching\n");
                socket.send(text, 0, text.length, rinfo.port, target.ip);
                target.port = rinfo.port;
            }
        });
    };
}


exports.Client = Client;

