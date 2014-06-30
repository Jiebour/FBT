var fs = require('fs');

var filepath1 = 'test.mp4',
    filepath2 = 'test-local.mp4',
    filesize = 126401476,// filepath1, 2, filesize获取的位置都得改
    BLOCK_SIZE = 4096,  // bytes
    BLOCK_IN_PART = 1024,
    server_ip = "127.0.0.1";

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

/*
目前仅测试一对一的传输, 实际中得用uid_list中的每个值连一遍
实际中, uid_list应该是在之前就已经得到的, 这里假定已知
 */
var uid_list = [1];

exports.source_file = filepath1;
exports.download_file = filepath2;
exports.filesize = filesize;
exports.BLOCK_SIZE = BLOCK_SIZE;
exports.unit_delay_time = unit_delay_time;
exports.BLOCK_IN_PART = BLOCK_IN_PART;
exports.server_ip = server_ip;
exports.stun_exe = stun_exe;