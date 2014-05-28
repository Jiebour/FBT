/*
存储格式
{
    {name: filename1, hashlist: [block1hash, block2hash, ...], hash: final_hash}
    {name: filename2, hashlist: [block1hash, block2hash, ...], hash: final_hash}
    ...
}
final_hash 由分块 hash 的结果连起来做 hash 生成
 */


var xxhash = require('xxhash')
  , fs = require('fs')
  , path = require('path')
  , Datastore = require('nedb');


function dohash(filepath, seed) {
    // 清理数据库
    var db = new Datastore({ filename: 'nedb_data/nedb.data', autoload: true });
    var old_data = [];
    db.find({}, function(err, docs) {
        old_data = docs;
        console.log("old record count: %d", docs.length);
    });
    db.remove({}, {multi: true}, function(err, numRemoved) {
        console.log("removed %d", numRemoved);
    });


    var readable = fs.createReadStream(filepath),
        filesize = fs.statSync(filepath)['size'],
        M = 1024 * 1024,
        flag = 0;

    var count = 0, oneMdata, hash, hashlist=[], hashstring='', final_hash;
    readable.on('readable', function() {
        while ((filesize - count * M > M)) {
            if (null != (oneMdata=readable.read(1024))) {  //异步读取
                count ++;
                flag = 1;
                hash = xxhash.hash(oneMdata, seed);
                hashlist.push(hash);
                hashstring += hash;
            }
        }
        if (flag) {  // 只要是readable的状态就会进入function, 所以必须限制使得读取完成之后回调函数不再起作用
            flag = 0;
            oneMdata = readable.read();
            console.log('block count:' + ++count);
            console.log("last block size: " + oneMdata.length);
            hash = xxhash.hash(oneMdata, seed);
            hashlist.push(hash);
            hashstring += hash;
            final_hash = xxhash.hash(Buffer(hashstring), seed);
            db.insert({
                'filename': path.basename(filepath),
                'hashlist': hashlist,
                'hash': final_hash
            }, function(err, newDoc) {
                console.log("\nnew record: " + JSON.stringify(newDoc));
            });
        }
    });
}

exports.dohash = dohash;