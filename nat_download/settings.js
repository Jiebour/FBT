var fs = require('fs');
var path = require('path');

var BLOCK_SIZE = 4096,  // bytes
    BLOCK_IN_PART = 1024,
    partsize = BLOCK_IN_PART * BLOCK_SIZE,
    seed = 0xAAAA,
    DOWNLOAD_PART_STATE_FILE = path.join(__dirname, 'downloadpartState.json');

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


var DEBUG = true;


var DownloadState = {
    DOWNLOAD_OVER: 0,
    DOWNLOADING: 1,
    CANCELED: 2,
    PAUSED: 3,
    DOWNLOAD_ERR: 4
};


exports.BLOCK_SIZE = BLOCK_SIZE;
exports.unit_delay_time = unit_delay_time;
exports.BLOCK_IN_PART = BLOCK_IN_PART;
exports.partsize = partsize;
exports.stun_exe = stun_exe;
exports.FullCone = FullCone;
exports.RestrictNAT = RestrictNAT;
exports.RestrictPortNAT = RestrictPortNAT;
exports.SymmetricNAT = SymmetricNAT;
exports.NATTYPE = NATTYPE;
exports.DEBUG = DEBUG;
exports.DownloadState = DownloadState;
exports.seed = seed;
exports.DOWNLOAD_PART_STATE_FILE = DOWNLOAD_PART_STATE_FILE
