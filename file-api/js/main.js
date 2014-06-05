//require('nw.gui').Window.get().showDevTools();
var fileapi = require('../js/fileapi');
var result = fileapi.add_res('resources/file1.txt', document);


require('fs').readFile('resources/file1.txt', function(err, data) {
    console.log(data.toString());
    document.getElementById("body").innerHTML = data + '\n';
});
