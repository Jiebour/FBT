//require('nw.gui').Window.get().showDevTools();
var fileapi = require('res_api');

function init_event_listener() {
    res_api.add_res('resources/file1.txt', document);
}

exports.init_event_listener = init_event_listener;

