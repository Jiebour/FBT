var nedb = require('nedb'),
    utils = require('./utils');


function add_res(filepath, document) {
    var seed = 0xAAAA;
    try {
        utils.store_res_hash(filepath, seed);
        utils.store_res_info(filepath);
    }
   catch(err) {
        console.log(err.message);
    }
}


function get_res_info(filename) {
    var res_info_collection = new Datastrore({filename: '../nedb_data/res_info', autoload: true});
    return res_info_collection.find({'name': filename}, function(err, docs) {
        utils.update_page_content(docs, 'get_res_file_info:\n');
    });  // 返回k-v形式的object, 如果没有返回{}
}


function get_allres_info() {
    return res_info_collection.find({}, function(err, docs) {
        console.log(err);
        console.log(JSON.stringify(docs));
    });
}


function check_res_update() {
    //
}


exports.add_res = add_res;
exports.get_res_info = get_res_info;
exports.get_allres_info = get_allres_info;
exports.check_res_update = check_res_update;
