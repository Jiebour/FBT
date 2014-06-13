//require('nw.gui').Window.get().showDevTools();
var res_api = require('../js/res_api');

function init() {
    window.document.monitors = [];
    res_api.check_allres_update();
    res_api.watch_allres(window.document.monitors);
}

exports.init = init;

