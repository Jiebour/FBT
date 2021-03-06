var fs = require('fs');

var filepath1 = 'test.mp4',
    filepath2 = 'test-local.mp4',
    filesize = fs.statSync(filepath1)['size'],
    BLOCK_SIZE = 4096,  // bytes
    BLOCK_IN_PART = 1024,
    server_ip = "127.0.0.1",
    seed = 0xAAAA;

// delay time
var unit_delay_time = 2000; // 该值最好和文件大小关联上

exports.source_file = filepath1;
exports.download_file = filepath2;
exports.filesize = filesize;
exports.BLOCK_SIZE = BLOCK_SIZE;
exports.unit_delay_time = unit_delay_time;
exports.BLOCK_IN_PART = BLOCK_IN_PART;
exports.server_ip = server_ip;
exports.seed = seed;
