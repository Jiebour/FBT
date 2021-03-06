var Datastore = require('nedb'),
    utils = require('./utils'),
    fs = require('fs'),
    settings = require('./settings')
    $ = require('jquery');

var RES_INFO_PATH = settings.RES_INFO_PATH;

function add_res(filepath, res_info_collection, res_hash_collection) {
    try {
        //DRBUG
        console.log("monitors before adding: ");
        for (var file in global.monitors) {
            console.log(global.monitors[file]);
        }

        utils.store_res_info(filepath, global.monitors, res_info_collection);
        utils.store_res_hash(filepath, settings.seed, res_hash_collection);
    }
    catch(err) {
        console.log(err.message);
    }
}


function get_res_info(filename, res_info_collection) {
    return res_info_collection.find({'name': filename}, function(err, docs) {
        utils.update_page_content(docs, 'get_res_file_info:\n');
    });
}


function get_allres_info(res_info_collection) {
    return res_info_collection.find({}, function(err, docs) {
        if (err)
            console.log(err.message);
        console.log(docs);
    });
}


function get_allres_hash(res_hash_collection) {
    return res_hash_collection.find({}, function(err, docs) {
        if (err)
            console.log(err.message);
        console.log(docs);
    });
}


function remove_res(filepath, res_info_collection, res_hash_collection) {
    utils.remove_res_infohash(filepath, global.monitors, res_info_collection, res_hash_collection);
    console.log(filepath + ' removed');
}


function check_allres_update(res_info_collection, res_hash_collection) {
    /*
    在开始监视文件之前必须检查文件在FBT客户端关闭的这段时间内的更改, 若有更改, 必须提示用户(其它操作待定)
     */
    if (!fs.existsSync(RES_INFO_PATH)) {
        console.log("no res exists, stop checking update");
        return;
    }

    res_info_collection.find({}, function(err, docs) {
        docs.forEach(function(res_info){
            res_hash_collection.findOne({'path': res_info.path}, function(err, res_hash){
                utils.check_res_update(res_info, res_hash, res_info_collection, res_hash_collection);
            });
        });
    });
}


function watch_allres(res_info_collection, window) {

    if (!fs.existsSync(RES_INFO_PATH)) {
        console.log("no res exists, stop watching res");
        return;
    }

    res_info_collection.find({}, function(err, docs) {
        if (err)
            console.log(err.message);
        docs.forEach(function(doc){
            fs.exists(doc.path, function(exists){
                if (exists) {
                    utils.createMonitor(doc, global.monitors);
                    // use jquery in nodejs
                    $(window.document).find("#res").prepend(
                        "<input type=\"checkbox\" name=\"resources\" value=\""
                        + doc.path + "\">" + doc.path + "<br />");
                }
                else {
                    // 文件已删除, 但是数据库中还存在
                }
            });
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
