//require('nw.gui').Window.get().showDevTools();
var res_api = require('../js/res_api'),
    Datastore = require('nedb'),
    settings = require('./settings');

var RES_INFO_PATH = settings.RES_INFO_PATH,
    RES_HASH_PATH = settings.RES_HASH_PATH;

function init(res_info_collection, res_hash_collection) {
    global.monitors = [];

    res_api.check_allres_update(res_info_collection, res_hash_collection);
    res_api.watch_allres(res_info_collection, global.monitors);
    //TODO: 全局monitors
}

exports.init = init;

