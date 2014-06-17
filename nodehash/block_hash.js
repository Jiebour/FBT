/*
存储格式
{
    path: filepath,
    hashlist: [block1hash, block2hash, ...],
    hash: final_hash
    verify: direct_file_hash
}
final_hash 由分块 hash 的结果连起来做 hash 生成
direct_file_hash 直接hash文件得到, 用于检验文件是否被修改
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
        while (filesize - count * M > M) {
            if (null != (oneMdata=readable.read(1024))) {  //异步读取
                count ++;
                hash = xxhash.hash(oneMdata, seed);
                hashlist.push(hash);
                hashstring += hash;
            }
            if (filesize - count * M <= M)
                flag = 1;  // 退出循环前, 把flag置1, 保证之后可以读取最后一块
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

    var hasher = new xxhash(seed);
    fs.createReadStream(filepath)
        .on('data', function(data) {
            hasher.update(data);
        })
        .on('end', function(){
            var hashvalue = hasher.digest();
            console.log(hashvalue);
            db.update({'filename': path.basename(filepath)}, {'$set': {'verify': hashvalue}}, {}, function() {
                db.find({}, function(err, docs){
                    console.log(docs);
                });
            });
        });
}

exports.dohash = dohash;
