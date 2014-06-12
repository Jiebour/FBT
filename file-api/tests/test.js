/*

注意: watch 不能通过 npm安装, 要直接去 github 下载
https://github.com/mikeal/watch
因为 release 版本有bug!

把文件修改信息添加到一个队列
测试项目:
1. add_res, 检测watcher.files
2. 修改/删除文件, 检测队列变化
2. remove_res(db), monitor.stop, 然后修改这个文件, 队列应该没有变化
 */

var utils = require('../js/utils'),
    fs = require('fs'),
    watch = require('watch'),
    path = require('path'),
    fileapi = require('../js/res_api');

var file1 = 'resources/file1.txt',
    file2 = 'resources/file2.py';

var monitors = [];

(function () {

    function is_watch_file(watchfile, f) {
        return path.normalize(watchfile) == path.normalize(f);
    }

    //test add_res
    utils.mock_store_res_hash(file1); //mock because xxhash can only be used in node-webkit

    (function(){
        utils.store_res_info(file1, monitors, function(newDoc){
            var watch_root = path.dirname(newDoc.path);
            watch.createMonitor(watch_root, {'filter': function(f, stat){
                /*
                * exclude other files, but still watch the file's dir.
                * in fact a monitor is forced to watch at least a dir,
                * so in event handler we have to exclude unrelated events again.
                * we could disuse filtering here, but it's not good to watch all
                * and leave everything to be filtered in event handler.
                */
                if (path.basename(newDoc.path) == path.basename(f))
                    return true
            }}, function(monitor){

                monitors.push(monitor);

                monitor.on("created", function (f, stat) {
                    if (!is_watch_file(newDoc.path, f)) return;
                    if (f === null)
                        console.log("on create, filename is null");
                    else {
                        console.log(f + " has been created.");
                    }
                });
                monitor.on("changed", function (f, curr, prev) {
                    if (!is_watch_file(newDoc.path, f)) return;
                    if (f === null)
                        console.log("on change, filename is null");
                    else {
                        console.log(f + " has changed.");
                    }
                });
                monitor.on("removed", function (f, stat) {
                    if (!is_watch_file(newDoc.path, f)) return;
                    if (f === null)
                        console.log("on delete, filename is null");
                    else {
                        console.log(f + " has been removed.");
                    }
                });

                // file ops
                setTimeout(function() {
                    console.log("start modifying");
                    fs.appendFileSync(newDoc.path, 'me added');
                    setTimeout(function(){
                        console.log("start removing");
                        fs.unlink(newDoc.path);
                        setTimeout(function(){
                            console.log("start recreating");
                            fs.appendFileSync(newDoc.path, 'this is file 1');
                        }, 3000);
                    }, 5000);
                } ,3000);
            });
        });
    })();


    // test remove_res, wait for previous test to end
    setTimeout(function() {
        utils.remove_res_infohash(file1, monitors, function(events, monitors){
            var monitor1 = monitors.shift();
            monitor1.stop();
            fs.appendFileSync(file1, '\nthis is file 1');
            setTimeout(function(){
                console.log("\nfile has changed but should show nothing.\n");

                // do clean job, restore files
                fs.writeFile(file1, "this is file 1");
                res_api.get_allres_info();
                res_api.get_allres_hash();
            }, 4000);
        });
    }, 20000);
})();

