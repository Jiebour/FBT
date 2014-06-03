使用方法
------
依赖库

1. xxhash

2. nedb

调用 `block_hash.js` 中的 `dohash` 函数, 可参考 `call_block_hash.js` 中的代码:

```javascript
var block_hash = require('./block_hash');

var filepath = 'files/file1'
  , seed = 0xAAAA;

block_hash.dohash(filepath, seed);
```