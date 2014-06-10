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
    path = require('path');

var file1 = 'resources/file1.txt',
    file2 = 'resources/file2.py';

var output_queue = [];

(function () {

    function is_watch_file(watchfile, f) {
        return path.normalize(watchfile) == path.normalize(f)
    }

    //test add_res

    (function(){
        utils.store_res_info(file1, function(newDoc){
            var watch_root = path.dirname(newDoc.path);
            watch.createMonitor(watch_root, {'filter': function(f, stat){
                if (path.basename(file1) == path.basename(f))
                    return true
            }}, function(monitor){
                monitor.on("created", function (f, stat) {
                    if (!is_watch_file(file1, f)) return;
                    if (f === null)
                        console.log("on create, filename is null");
                    else {
                        console.log(f + " has been created.");
                        output_queue.push(f);
                    }
                });
                monitor.on("changed", function (f, curr, prev) {
                    if (!is_watch_file(file1, f)) return;
                    if (f === null)
                        console.log("on change, filename is null");
                    else {
                        console.log(f + " has changed.");
                        output_queue.push(f);
                    }
                });
                monitor.on("removed", function (f, stat) {
                    if (!is_watch_file(file1, f)) return;
                    if (f === null)
                        console.log("on delete, filename is null");
                    else {
                        console.log(f + " has been removed.");
                        output_queue.push(f);
                    }
                });

                // file ops
                setTimeout(function() {
                    console.log("start modifying");
                    fs.appendFileSync(file1, 'me added');
                    setTimeout(function(){
                        console.log("start removing");
                        fs.unlink(file1);
                        setTimeout(function(){
                            console.log("start recreating");
                            fs.appendFileSync(file1, 'this is file 1');
                            setTimeout(function(){
                                monitor.stop();
                            }, 3000);
                        }, 3000);
                    }, 5000);
                } ,3000);
            });
        });
    })();


    // test remove_res

    (function(){
        // do clean job, restore files

    })();
})();

