//require('nw.gui').Window.get().showDevTools();
var res_api = require('res_api');

function init() {
    res_api.add_res('resources/file1.txt', document);
    var monitors = [];
    res_api.watch_allres(monitors);
}

exports.init = init;

