//require('nw.gui').Window.get().showDevTools();
var res_api = require('../js/res_api'),
    Datastore = require('nedb');


function init(res_info_collection, res_hash_collection, window) {
    global.monitors = {};  // {path1: monitor1, path2: monitor2}
    res_api.check_allres_update(res_info_collection, res_hash_collection);
    res_api.watch_allres(res_info_collection, window);
}

exports.init = init;

