//require('nw.gui').Window.get().showDevTools();
var fileapi = require('../js/fileapi');

function init_event_listener() {
    fileapi.add_res('resources/file1.txt', document);
}

exports.init_event_listener = init_event_listener;

