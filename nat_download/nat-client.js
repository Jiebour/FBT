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
	var sockfd = null, target = null;
	var peer_nat_type = null;
    var nat_type = nat_type;
	

	this.request_for_connection = function (nat_type_id) {
		sockfd = dgram.createSocket("udp4");
		var msg = new Buffer(pool + ' ' + nat_type_id);  // msg是Buffer
        sockfd.send(msg, 0, msg.length, master.port, master.ip);
        var sendmsg = new Buffer('ok');
        var message;

        var messageforconnect = function(msg, rinfo) {
            /*本来是用switch, 但是不知道为什么就是有bug,只能转用多个条件判断*/
            message = msg.toString();
            console.log(message);
            if (message == "ok " + pool) {
                sockfd.send(sendmsg, 0, 2, master.port, master.ip);
                console.log("request sent, waiting for partner in pool %s...", pool);
            } else if (msg.length == 7) {
                var result = utils.bytes2addr(msg);
                target = {ip: result[0], port: result[1]};
                peer_nat_type = NATTYPE[result[2]];
                console.log("connected to %s:%s, its NAT type is %s",
                            result[0], result[1], peer_nat_type);
                sockfd.removeListener('message', messageforconnect);
                chat(nat_type);
            } else {
                console.log("Got invalid response: " + msg);
                process.exit(2);
            }
        };
		sockfd.on('message', messageforconnect);
	};

    var chat = function(nat_type){
        if (nat_type == SymmetricNAT || peer_nat_type == SymmetricNAT) {
            console.log("Symmetric chat mode");
            chat_symmetric();
        }
        else if (nat_type == FullCone) {
            console.log("FullCone chat mode");
            chat_fullcone();
        }
        else if (nat_type == RestrictNAT || nat_type == RestrictPortNAT) {
            console.log("Restrict chat mode");
            chat_restrict();
        } else {
            console.log("NAT type wrong!");
        }
    };

    var chat_fullcone = function() {
        process.stdin.on('data', function(text) {
            var text = new Buffer(text);  //奇怪的是单独测试时不需要转成buffer?
            sockfd.send(text, 0, text.length, target.port, target.ip);
        });
        sockfd.on('message', function(msg, rinfo) {
            var msg = msg.toString('utf8');
            process.stdout.write("peer: " + msg);
            if (msg == 'punching...\n') {
                var text = new Buffer("end punching\n");
                sockfd.send(text, 0, text.length, target.port, target.ip);
            }
        });
    };

    //现在没必要用event,直接在periodic_running=false的时候开stdin.on
    var chat_restrict = function() {
        var periodic_running = true;
        function send(count) {
            var text = new Buffer("punching...\n");
            sockfd.send(text, 0, text.length, target.port, target.ip);
            console.log("UDP punching package %d sent", count);
            setTimeout(function(){
                if (periodic_running)
                    send(count+1);
            }, 500);
        }
        send(0);
        sockfd.on('message', function(msg, rinfo) {
            if (periodic_running) {
                console.log("periodic_send is alive");
                periodic_running = false;
                process.stdin.on('data', function(text) {
                    var text = new Buffer(text);
                    sockfd.send(text, 0, text.length, target.port, target.ip);
                });
            }
            var msg = msg.toString('utf8');
            process.stdout.write("peer: " + msg);
            if (msg == 'punching...\n') {
                var text = new Buffer("end punching\n");
                sockfd.send(text, 0, text.length, target.port, target.ip);
            }
        });
    };

    var chat_symmetric = function() {
        //通过服务器转发, 这部分需要跟智华师兄协作完成
    };
}



exports.Client = Client;

