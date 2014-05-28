var block_hash = require('./block_hash');

var filepath = 'files/file1'
  , seed = 0xAAAA;

block_hash.dohash(filepath, seed);
