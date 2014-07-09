//try {
//    require('nw.gui').Window.get().showDevTools();
//}
//catch(e){
//
//}


var res_api = require('./res_api'),
    Datastore = require('nedb'),
    utils = require('./utils');


function init(res_info_collection, res_hash_collection, window) {
    global.monitors = {};  // {path1: monitor1, path2: monitor2}
    res_api.check_allres_update(res_info_collection, res_hash_collection);
    res_api.watch_allres(res_info_collection, window);
}


function clear(res_info_collection, res_hash_collection) {
    utils.clear_db(global.monitors, res_info_collection, res_hash_collection);
    console.log("all cleared");
}

exports.init = init;
exports.clear = clear;
