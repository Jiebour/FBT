/*
res_hash 存储格式
{
    {name: filename1, hashlist: [block1hash, block2hash, ...], hash: final_hash}
    {name: filename2, hashlist: [block1hash, block2hash, ...], hash: final_hash}
    ...
}
final_hash 由分块 hash 的结果连起来做 hash 生成
 */


var fs = require('fs')
  , path = require('path')
  , Datastore = require('nedb');


function store_res_hash(filepath, seed, todo) {
    var xxhash = require('xxhash');
    // 清理数据库
    try {
        var db = new Datastore({ filename: 'nedb_data/res_block_hash', autoload: true });
        var old_data = [];
        db.find({}, function (err, docs) {
            old_data = docs;
            console.log("old record count: %d", docs.length);
        });
        db.remove({}, {multi: true}, function (err, numRemoved) {
            console.log("removed %d", numRemoved);
        });


        var readable = fs.createReadStream(filepath),
            filesize = fs.statSync(filepath)['size'],
            M = 1024 * 1024;

        var count=0, oneMdata, hash, hashlist = [], hashstring = '', final_hash;
        var flag = (filesize - count * M > M) ? 0 : 1;  // 如果不满1M数据, 那么flag=1, 直接读取最后一块

        readable.on('readable', function () {
            while (filesize - count * M > M) {
                if (null != (oneMdata = readable.read(1024))) {  //异步读取
                    count++;
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
                }, function (err, newDoc) {
                    console.log("\nnew record: " + JSON.stringify(newDoc));
                    todo = (typeof(todo) === 'undefined') ? update_page_content : todo;
                    todo(newDoc);
                });
            }
        });
    }
    catch (err) {
        console.log(err.message);
    }
}


function store_res_info(filepath, todo) {
    /*存储资源的 名字, 在用户电脑中的绝对位置, 大小, mtime*/
    var res_info_collection = new Datastore({filename: 'nedb_data/res_info', autoload: true}),
        filename = path.basename(filepath),
        filesize = fs.statSync(filepath)['size'],
        mtime = fs.statSync(filepath)['mtime'];

    res_info_collection.insert({
        'name': filename,
        'path': filepath,
        'size': filesize,
        'mtime': mtime
    }, function(err, newDoc) {
        todo = (typeof(todo) === 'undefined') ? update_page_content : todo;
        todo(newDoc);
    });
}


// 邓波请修改update_page_content函数, 因为资源信息在callback中才能获取, 所以没法作为返回值
// 现在作为演示, 把资源信息显示在页面上, 实际中怎么用得你来考虑
// 总之传入的参数是js object形式的资源信息
function update_page_content(json, extra) {
    extra = (typeof extra === "undefined") ? '' : extra;
    document.getElementById("body").innerHTML += extra + '<br />' + JSON.stringify(json);
}


exports.store_res_hash = store_res_hash;
exports.store_res_info = store_res_info;
exports.update_page_content = update_page_content;