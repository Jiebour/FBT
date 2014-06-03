var fs = require('fs'),
    Datastrore = require('nedb'),
    path = require('path');


function store_res_info(filepath) {
    /*存储资源的 名字, 在用户电脑中的绝对位置, 大小, mtime*/
    var res_info_collection = new Datastrore({filename: '../nedb_data/res_info', autoload: true}),
        filename = path.basename(filename),
        filesize = fs.statSync(filepath)['size'],
        mtime = fs.statSync(filepath)['mtime'];

    res_info_collection.insert({
        'name': filename,
        'path': filepath,
        'size': filesize,
        'mtime': mtime
    }, function(err, newDoc) {
        return newDoc;
    });
}



exports.store_res_info = store_res_info;