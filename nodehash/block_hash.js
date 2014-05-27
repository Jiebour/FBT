var xxhash = require('xxhash')
  , fs = require('fs')
  , path = require('path')
  , Datastore = require('nedb')
  , db = new Datastore({ filename: 'nedb_data/nedb.data', autoload: true });

// 清理数据库
var old_data = [];
db.find({}, function(err, docs) {
    old_data = docs;
    console.log("old data number: %d", docs.length);
});
db.remove({}, {multi: true}, function(err, numRemoved) {
    console.log("removed %d", numRemoved);
});


filepath = 'files/file1';

var readable = fs.createReadStream(filepath),
    filesize = fs.statSync(filepath)['size'],
    M = 1024 * 1024, flag = 0;

function hash_then_insert(data, db, count) {
    hash = xxhash.hash(data, 0xAAAABBB);
    db.insert({
        'index': count,
        'hash': hash
    }, function(err, newDoc) {
        console.log(newDoc);
    });
}

var count = 0, oneMdata, oneMhash;
readable.on('readable', function() {
    while ((filesize - count * M > M)) {
        if (null != (oneMdata=readable.read(1024))) {  //异步读取
            count ++;
            flag = 1;
            console.log(count);
            hash_then_insert(oneMdata, db, count);
        }
    }
    if (flag) {  // 只要是readable的状态就会进入function, 所以必须限制使得读取完成之后回调函数不再起作用
        flag = 0;
        oneMdata = readable.read();
        console.log(++count);
        console.log(oneMdata.length);
        hash_then_insert(oneMdata, db, count);
    }
});


