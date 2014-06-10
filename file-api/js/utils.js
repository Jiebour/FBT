/*
res_hash 存储格式
{
    {path: file1path, hashlist: [block1hash, block2hash, ...], hash: final_hash}
    {path: file2path, hashlist: [block1hash, block2hash, ...], hash: final_hash}
    ...
}
final_hash 由分块 hash 的结果连起来做 hash 生成
根据filepath确保每个文件的【唯一性】
 */


var fs = require('fs')
  , path = require('path')
  , Datastore = require('nedb');


function mock_store_res_hash(file) {
    var db = new Datastore({ filename: 'nedb_data/res_hash', autoload: true });
    db.update(
        { 'path': file },
        { 'path': file, 'hashlist': [], 'hash': 111},
        { 'multi': true, 'upsert': true }
    );
}

function store_res_hash(filepath, seed, todo) {
    var xxhash = require('xxhash');
    // 清理数据库
    try {
        var db = new Datastore({ filename: 'nedb_data/res_hash', autoload: true });
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
                var newDoc = {
                    'path': filepath,
                    'hashlist': hashlist,
                    'hash': final_hash
                };
                db.update(
                    { 'path': filepath },
                    newDoc,
                    { 'multi': true, 'upsert': true },
                    function (err, numReplaced) {
                        if (numReplaced != 1) {
                            console.log("has duplicate res_hash document!");
                        }
                        console.log("\nnew record: " + JSON.stringify(newDoc));
                        todo = (typeof(todo) === 'undefined') ? update_page_content : todo;
                        todo(newDoc);
                    }
                );
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

    var newDoc = {
        'name': filename,
        'path': filepath,
        'size': filesize,
        'mtime': mtime
    };

    res_info_collection.update(
        { 'path': filepath },
        newDoc,
        { 'multi': true, 'upsert': true },
        function(err, numReplaced) {
            if (numReplaced != 1) {
                console.log("has duplicate res_info documents!");
            }
            todo = (typeof(todo) === 'undefined') ? update_page_content : todo;
            todo(newDoc);
        }
    );
}


function remove_res_infohash(filepath, todo) {
    var res_info_collection = new Datastore({filename: 'nedb_data/res_info', autoload: true}),
        res_hash_collection = new Datastore({filename: 'nedb_data/res_hash', autoload: true});

    var query = {'path': filepath};
    res_info_collection.count(query, function(err, count) {
        if (count != 1)
            return;
        res_hash_collection.count(query, function(err, count) {
            if (count != 1)
                return;
            res_info_collection.remove(query, {});
            res_hash_collection.remove(query, {});
            todo();
        });
    });
}


// 邓波请修改update_page_content函数, 因为资源信息在callback中才能获取, 所以没法作为返回值
// 现在作为演示, 把资源信息显示在页面上, 实际中怎么用得你来考虑
// 总之传入的参数是js object形式的资源信息
function update_page_content(json, extra) {
    extra = (typeof extra === "undefined") ? '' : extra;
    document.getElementById("body").innerHTML += extra + '<br />' + JSON.stringify(json);
}


exports.mock_store_res_hash = mock_store_res_hash;
exports.store_res_hash = store_res_hash;
exports.store_res_info = store_res_info;
exports.remove_res_infohash = remove_res_infohash;
exports.update_page_content = update_page_content;