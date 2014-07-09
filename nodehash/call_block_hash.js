var block_hash = require('./block_hash');

var filepath = 'files/test.mp4'
  , seed = 0xAAAA;

block_hash.dohash(filepath, seed);
