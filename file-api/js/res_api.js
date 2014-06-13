var Datastore = require('nedb'),
    utils = require('./utils'),
    fs = require('fs');


function add_res(filepath, monitors) {
    var seed = 0xAAAA;
    try {
        console.log(filepath);
        utils.store_res_info(filepath, monitors);
        utils.store_res_hash(filepath, seed);
    }
    catch(err) {
        console.log(err.message);
    }
}


function get_res_info(filename) {
    var res_info_collection = new Datastore({filename: 'nedb_data/res_info', autoload: true});
    return res_info_collection.find({'name': filename}, function(err, docs) {
        utils.update_page_content(docs, 'get_res_file_info:\n');
    });
}


function get_allres_info() {
    var res_info_collection = new Datastore({filename: 'nedb_data/res_info', autoload: true});
    return res_info_collection.find({}, function(err, docs) {
        if (err)
            console.log(err.message);
        console.log(docs);
    });
}


function get_allres_hash() {
    var res_hash_collection = new Datastore({filename: 'nedb_data/res_hash', autoload: true});
    return res_hash_collection.find({}, function(err, docs) {
        if (err)
            console.log(err.message);
        console.log(docs);
    });
}


function remove_res(filepath) {
    utils.remove_res_infohash(filepath, function(){
        console.log(filepath + ' removed');
    });
}


function check_allres_update() {
    /*
    在开始监视文件之前必须检查文件在FBT客户端关闭的这段时间内的更改, 若有更改, 必须提示用户(其它操作待定)
     */
    if (!fs.existsSync('nedb_data/res_info')) {
        console.log("no res exists, stop checking update");
        return;
    }

    var res_info_collection = new Datastore({filename: 'nedb_data/res_info', autoload: true}),
        res_hash_collection = new Datastore({filename: 'nedb_data/res_hash', autoload: true});

    res_info_collection.find({}, function(err, docs) {
        docs.forEach(function(res_info){
            res_hash_collection.findOne({'path': res_info.path}, function(err, res_hash){
                utils.check_res_update(res_info, res_hash, res_info_collection);
            });
        });
    });
}


function watch_allres(monitors) {

    if (!fs.existsSync('nedb_data/res_info')) {
        console.log("no res exists, stop watching res");
        return;
    }

    var res_info_collection = new Datastore({filename: 'nedb_data/res_info', autoload: true});

    res_info_collection.find({}, function(err, docs) {
        if (err)
            console.log(err.message);
        docs.forEach(function(doc){
            utils.createMonitor(doc, monitors);
        });
    });
}


exports.add_res = add_res;
exports.get_res_info = get_res_info;
exports.get_allres_info = get_allres_info;
exports.get_allres_hash = get_allres_hash;
exports.remove_res = remove_res;
exports.check_allres_update = check_allres_update;
exports.watch_allres = watch_allres;
