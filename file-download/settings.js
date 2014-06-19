var fs = require('fs');

var filepath1 = 'fav.mp3',
    filepath2 = 'fav-local.mp3',
    filesize = fs.statSync(filepath1)['size'],
    SPLITTER = '@@@@@',
    SPLITTERLENGTH = SPLITTER.length,
    BLOCK_SIZE = 400;

exports.source_file = filepath1;
exports.download_file = filepath2;
exports.filesize = filesize;
exports.SPLITTER = SPLITTER;
exports.SPLITTERLENGTH = SPLITTERLENGTH;
exports.BLOCK_SIZE = BLOCK_SIZE;
