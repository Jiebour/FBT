var fs = require('fs');

var filepath1 = 'test.mp4',
    filepath2 = 'test-local.mp4',
    filesize = 126401476,// filepath1, 2, filesize获取的位置都得改
    BLOCK_SIZE = 4096,  // bytes
    BLOCK_IN_PART = 1024,
    nat_server_ip = "205.147.105.205",
    nat_server_port = 1111;

// delay time
var unit_delay_time = 2000; // 该值最好和文件大小关联上

// detect platform
var MAC = 'darwin',
    BSD = 'freebsd',
    LINUX = 'linux',
    SUN = 'sunos',
    WIN = 'win32';

var stun_exe;
switch (process.platform) {
    case MAC: {
        stun_exe = "stun_Mac";
        break;
    }
    case LINUX: {
        stun_exe = "stun_Linux";
        break;
    }
    case WIN: {
        stun_exe = "stun_Win.exe";
        break;
    }
    default :{
        console.log("We don't support this platform.");
    }
};



var FullCone = "Full Cone";  // 0
var RestrictNAT = "Restrict NAT";  // 1
var RestrictPortNAT = "Restrict Port NAT";  // 2
var SymmetricNAT = "Symmetric NAT";  // 3
var NATTYPE = [FullCone, RestrictNAT, RestrictPortNAT, SymmetricNAT];


exports.nat_server_ip = nat_server_ip;
exports.nat_server_port = nat_server_port;
exports.source_file = filepath1;
exports.download_file = filepath2;
exports.filesize = filesize;
exports.BLOCK_SIZE = BLOCK_SIZE;
exports.unit_delay_time = unit_delay_time;
exports.BLOCK_IN_PART = BLOCK_IN_PART;
exports.server_ip = server_ip;
exports.stun_exe = stun_exe;
exports.FullCone = FullCone;
exports.RestrictNAT = RestrictNAT;
exports.RestrictPortNAT = RestrictPortNAT;
exports.SymmetricNAT = SymmetricNAT;
exports.NATTYPE = NATTYPE;

