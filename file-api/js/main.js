//require('nw.gui').Window.get().showDevTools();
var res_api = require('../js/res_api'),
    Datastore = require('nedb'),
    settings = require('./settings');

var RES_INFO_PATH = settings.RES_INFO_PATH,
    RES_HASH_PATH = settings.RES_HASH_PATH;

function init(res_info_collection, res_hash_collection) {
    global.monitors = {};  // {path1: monitor1, path2: monitor2}
    res_api.check_allres_update(res_info_collection, res_hash_collection);
    res_api.watch_allres(res_info_collection);
}

exports.init = init;

