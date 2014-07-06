/*
res_hash 存储格式
{
    path: filepath,
    hashlist: [block1hash, block2hash, ...],
    hash: final_hash
    verify: direct_file_hash
}
final_hash 由分块 hash 的结果连起来做 hash 生成
direct_file_hash 直接hash文件得到, 用于检验文件是否被修改

res_info 存储格式
{
    name: filename,
    path: filepath,
    size: filesize,
    mtime: last modified time
}

根据path确保每个文件的【唯一性】, 这一点已经由store时的update操作保证,
所以别的操作都可已直接用findOne({'path':path})

凡是涉及数据库操作, 一律将path先规范化, path.normalize(path), Win和Unix分别用\和/

服务器端可以存储res_hash或者res_info的_id来对应本地资源
 */


var fs = require('fs')
  , path = require('path')
  , Datastore = require('nedb')
  , watch = require('watch')
  , settings = require('./settings');


var mode = "run";
var BLOCK_SIZE = settings.BLOCK_SIZE;

if (mode == "test")
    var xxhash = require('xxhash');     // xxhash for node
else
    var xxhash = require('xxhash_nw');  // rebuild xxhash for nw


function mock_store_res_hash(file, res_hash_collection) {
    res_hash_collection.update(
        { 'path': path.normalize(file) },
        { 'path': file, 'hashlist': [], 'hash': 111},
        { 'multi': true, 'upsert': true }
    );
}

function store_res_hash(filepath, seed, res_hash_collection, todo) {
    try {
        var readable = fs.createReadStream(filepath),
            filesize = fs.statSync(filepath)['size'];

        var count=0, oneMdata, hash, hashlist = [], hashstring = '', final_hash;

        // 不足一块数据, 那么flag=1, 直接读取最后一块
        var flag = (filesize - count * BLOCK_SIZE > BLOCK_SIZE) ? 0 : 1;

        readable.on('readable', function () {
            while (filesize - count * BLOCK_SIZE > BLOCK_SIZE) {
                if (null !== (oneMdata = readable.read(BLOCK_SIZE))) {
                    count++;
                    hash = xxhash.hash(oneMdata, seed);
                    hashlist.push(hash);
                    hashstring += hash;
                }
                else
                    break;

                if (filesize - count * BLOCK_SIZE <= BLOCK_SIZE)
                    flag = 1;  // 退出循环前, 把flag置1, 保证之后可以读取最后一块
            }

            if (flag) {  // 只要是readable的状态就会进入function, 所以必须限制使得读取完成之后回调函数不再起作用
                flag = 0;
                oneMdata = readable.read();
                console.log('block count:' + ++count + ", last block size: " + oneMdata.length);
                hash = xxhash.hash(oneMdata, seed);
                console.log(hashlist);
                hashlist.push(hash);
                hashstring += hash;
                final_hash = xxhash.hash(Buffer(hashstring), seed);
                var newDoc = {
                    'path': path.normalize(filepath),
                    'hashlist': hashlist,
                    'hash': final_hash,
                    'seed': seed
                };
                console.log(newDoc);
                res_hash_collection.update(
                    { 'path': path.normalize(filepath) },
                    newDoc,
                    { 'multi': true, 'upsert': true },
                    function (err, numReplaced) {
                        if (numReplaced != 1) {
                            console.log("found duplicate hash docs when storing");
                        }
                        todo = (typeof(todo) === 'undefined') ? update_page_content : todo;
                        todo(newDoc);
                    }
                );
            }

            // add verify field
            var hasher = new xxhash(seed);
            fs.createReadStream(filepath)
                .on('data', function(data) {
                    hasher.update(data);
                })
                .on('end', function(){
                    var hashvalue = hasher.digest();
                    res_hash_collection.update({'path': filepath}, {'$set': {'verify': hashvalue}}, {});
                });
            });
    }
    catch (err) {
        console.log(err.message);
    }
}


function store_res_info(filepath, monitors, res_info_collection, todo) {
    /*存储资源的 名字, 在用户电脑中的绝对位置, 大小, mtime*/
    var stats = fs.statSync(filepath);

    var newDoc = {
        'name': path.basename(filepath),
        'path': path.normalize(filepath),
        'size': stats['size'],
        'mtime': stats['mtime'].getTime()
    };

    res_info_collection.update(
        { 'path': path.normalize(filepath) },
        newDoc,
        { 'multi': true, 'upsert': true },
        function(err, numReplaced) {
            if (numReplaced != 1) {
                console.log("found duplicate info docs when storing");
            }
            todo = (typeof(todo) === 'undefined') ? update_monitors : todo;
            var events = {
                'store': newDoc
            };
            if (todo === update_monitors)
                todo(events, monitors);
            else
                todo(newDoc);
        }
    );
}


function remove_res_infohash(filepath, monitors, res_info_collection, res_hash_collection, todo) {
    var query = {'path': path.normalize(filepath)};
    res_info_collection.count(query, function(err, count) {
        if (count != 1) {
            console.log("Found duplicate/no info doc when removing");
            return;
        }
        res_hash_collection.count(query, function(err, count) {
            if (count != 1) {
                console.log("found duplicate/no hash doc when removing");
                return;
            }

            todo = (typeof(todo) === 'undefined') ? update_monitors : todo;
            res_info_collection.findOne(query, function(err, doc) {
                var events = {'remove': doc};
                todo(events, monitors);
            });
            res_info_collection.remove(query, {});
            res_hash_collection.remove(query, {});
        });
    });
}


function clear_db(monitors, res_info_collection, res_hash_collection) {
    res_hash_collection.find({}, function (err, docs) {
        console.log("\nold hash record:\n", JSON.stringify(docs));
        res_hash_collection.remove({}, {multi: true}, function (err, numRemoved) {
            console.log("\nremoved %d hash record", numRemoved);
        });
    });
    res_info_collection.find({}, function (err, docs) {
        console.log("\nold info record:\n", JSON.stringify(docs));
        res_info_collection.remove({}, {multi: true}, function (err, numRemoved) {
            console.log("\nremoved %d info record", numRemoved);
        });
    });

    var events = {'clear': true};
    update_monitors(events, monitors);
}


// 邓波请修改update_page_content函数, 因为资源信息在callback中才能获取, 所以没法作为返回值
// 现在作为演示, 把资源信息显示在页面上, 实际中怎么用得你来考虑
// 总之传入的参数是js object形式的资源信息
function update_page_content(json, extra) {
    extra = (typeof extra === "undefined") ? '' : extra;
//    document.getElementById("body").innerHTML += extra + '<br />' + JSON.stringify(json);
    console.log(json, extra);
}

function createMonitor(newDoc, monitors) {

    function is_watch_file(watchfile, f) {
        return path.normalize(watchfile) == path.normalize(f);
    }

    function createEventListener(monitor, res_path) {
        console.log("start watching file: ", res_path);
        monitor.on("created", function (f, stat) {
            if (!is_watch_file(res_path, f)) return;
            if (f === null)
                console.log("on create, filename is null");
            else {
                console.log(f + " has been created.");
            }
        });
        monitor.on("changed", function (f, curr, prev) {
            if (!is_watch_file(res_path, f)) return;
            if (f === null)
                console.log("on change, filename is null");
            else {
                console.log(f + " has changed.");
            }
        });
        monitor.on("removed", function (f, stat) {
            if (!is_watch_file(res_path, f)) return;
            if (f === null)
                console.log("on delete, filename is null");
            else {
                console.log(f + " has been removed.");
            }
        });
    }

    var res_path = newDoc.path,
        watch_root = path.dirname(res_path);

    watch.createMonitor(watch_root, {'filter': function(f){
        return (path.basename(res_path) == path.basename(f))
    }}, function(monitor){
        monitors[res_path] = monitor;
        createEventListener(monitor, res_path);
    });
}


// 数据库操作之后, 更新monitors, 根据events决定是加入新monitor还是停止旧monitor
// 不会在store_res_hash中调用
function update_monitors(events, monitors) {
    switch (Object.keys(events)[0]) {
        case 'clear':
            for (var file in monitors) {
                monitors[file].stop();  // stop需要时间, 如果马上delete会stop失败
                setTimeout(function(){
                    delete monitors[file];
                }, 2000);
            }
            break;
        case 'remove':
            var path = events['remove'].path;
            monitors[path].stop();
            setTimeout(function(){
                delete monitors[path];
            }, 2000);
            console.log("monitors after removing:");
            for (var f in monitors)
                console.log(monitors[f]);
            break;
        case 'store':
            var newDoc = events['store'];  // newDoc is res_info
            // 一个monitor和一个文件对应, 不能监视目录, 除非资源就是一个目录!
            if (!monitors.hasOwnProperty(newDoc.path))  // monitor不存在才添加
                createMonitor(newDoc, monitors);
    }
}


function check_res_update(res_info, res_hash, res_info_collection, res_hash_collection) {
    /*
    * this function should not operate on monitors, but only update db
     */
    var path = res_info.path;
    try {
        fs.stat(path, function(err, stats){
            if (res_info.mtime != stats['mtime'].getTime()) {
                // 一旦mtime不同, 再检查hash, 如果相同, 那么只需要更新res_info的mtime
                // 否则得调用store_res_info, store_res_hash进行更新
                var hasher = new xxhash(res_hash.seed);
                fs.createReadStream(path)
                    .on('data', function(data) {
                        hasher.update(data);
                    })
                    .on('end', function(){
                        var hashvalue = hasher.digest();
                        if (hashvalue == res_hash.verify) {
                            console.log(path, "modified but not changed");
                            // file content unchanged, only need to update mtime
                            res_info_collection.update(
                                {'path': path},
                                {'$set': {'mtime': stats['mtime'].getTime()}}, {}
                            );
                        }
                        else {
                            // file content changed, update all, TODO: 其它操作, 待添加
                            console.log(path, "modified and changed");
                            store_res_info(path, [], res_info_collection, update_page_content);
                            // don't touch monitors
                            store_res_hash(path, settings.seed, res_hash_collection);
                        }
                    });
            }
        });
    }
    catch(e) {
        if (e.code === 'ENOENT')
            console.log(path + ' has been removed.');
        else
            throw e;
    }
}



exports.mock_store_res_hash = mock_store_res_hash;
exports.store_res_hash = store_res_hash;
exports.store_res_info = store_res_info;
exports.remove_res_infohash = remove_res_infohash;
exports.clear_db = clear_db;
exports.update_page_content = update_page_content;
exports.createMonitor = createMonitor;
exports.check_res_update = check_res_update;