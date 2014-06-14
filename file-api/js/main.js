//require('nw.gui').Window.get().showDevTools();
var res_api = require('../js/res_api'),
    Datastore = require('nedb'),
    settings = require('./settings');

var RES_INFO_PATH = settings.RES_INFO_PATH,
    RES_HASH_PATH = settings.RES_HASH_PATH;

function init() {
    window.document.monitors = [];
    var res_info_collection = new Datastore({filename: RES_INFO_PATH, autoload: true}),
        res_hash_collection = new Datastore({filename: RES_HASH_PATH, autoload: true});
    res_api.check_allres_update(res_info_collection, res_hash_collection);
    res_api.watch_allres(res_info_collection, window.document.monitors);
    //TODO: 其它API也用传入的Datastore, 全局monitors
}

exports.init = init;

