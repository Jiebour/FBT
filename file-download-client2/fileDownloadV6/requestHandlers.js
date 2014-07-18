var querystring = require("querystring"),fs = require("fs");
var url = require('url');

var util = require('util');
var path = require('path');
var mime = require('mime');  

var utils = require('../fbtUtils/fbtUtils');

function about(request,response) {
  global.log.info("Request handler 'about' was called.");

  var body = '<html>'+
    '<head>'+
    '<meta http-equiv="Content-Type" '+
    'content="text/html; charset=UTF-8" />'+
    '</head>'+
    '<body>'+
    'Hello! It works!'+
    '</body>'+
    '</html>';
    response.writeHead(200, {"Content-Type": "text/html"});
    response.write(body);
    response.end();
}

var resourceDB=null;//set by file api

/**
 * get file path by hash.
 * return the filepath. if not found path, return null.
 */
function getFilePathByHashFromDB(hash){
  utils.assert(hash.length > 0);
    var DB={};
    if(resourceDB){
        DB=resourceDB;
    }else{//fake DB
        DB={"123":"../my-share/sample.zip",
          "456":"../my-share/fav.mp3",
          "789":"F:/node-webkit-bin/my-sample/my-share/stallman.jpg",
          "0":"./cleanUp.js",
          "1":"./router.js",
          "2":"./run.js",
          "3":"./server.js"};
  }
  return DB[hash];
}

/**
 * get header range like: Range: 0-123
 * return {start:0,end:123}
 */
function getHeaderRange(headerRange, totalSize){
  var parts = headerRange.replace(/bytes=/, "").split("-");
  var partialstart = parts[0];
  var partialend = parts[1];
  var start = parseInt(partialstart);
  var end = partialend ? parseInt(partialend) : totalSize-1;
  return {start: start, end: end};
}

/**
 * page 404
 */
function page404(response, content){
  utils.assert(content.length > 0);
  response.writeHead(404, {'content-type': 'text/html'});
  response.end(content);
}

function downloadFile(request, response) {
  var urlParts = url.parse(request.url, true);
  var query = urlParts.query;

  // request must has param file=xxx&size=xxx&hash=xxx
  // and they must in line with DB. if not, means the server return file info logic error.
  //var requestedFileName=query["file"];
  //var requestedFileSize=query["size"];
  var requestedFileHash=query["hash"];
  if(!requestedFileHash){
      return page404(response,"hash argument not found");
  }
  //utils.assert(requestedFileName.length > 0);
  //utils.assert(requestedFileSize.length > 0);
  //utils.assert(requestedFileHash.length > 0);

  var filePath=getFilePathByHashFromDB(requestedFileHash);
  if(!filePath){
    global.log.info("warning: resource not found.");
    return page404(response,"Resource not found. Maybe the user delete the file.");
  }
  global.log.info("OK: resource found.");
 
  var fileName = path.basename(filePath);
  //utils.assert(fileName === requestedFileName,"DB error or logic error");
  global.log.info("filepath:" + filePath);

  //var file = __dirname + '/'+ filePath;
  fs.exists(filePath, function fileExist(exists) {
      if (exists) {
          fs.stat(filePath, function fileSize(err, stats) {
	    if(!err){
              var totalSize = stats.size;
              //utils.assert(totalSize==requestedFileSize);
              var mimetype = mime.lookup(filePath);
              if (request.headers['range']) {
                var range = getHeaderRange(request.headers.range,totalSize);
                var start=range.start;
                var end=range.end;
                var chunksize = (end-start)+1;
                global.log.info('RANGE: ' + start + ' - ' + end + ' = ' + chunksize);
                utils.assert(start <= end);
                utils.assert(end < totalSize);
                
                var fileStream = fs.createReadStream(filePath, {start: start, end: end});
                var contentRange='bytes ' + start + '-' + end + '/' + totalSize;

                response.writeHead(206,{'Content-Range': contentRange, 'Accept-Ranges': 'bytes', 'Content-Length': chunksize, 'Content-Type': mimetype});            
                fileStream.pipe(response);
              } else {
                global.log.info('ALL RANGE: ' + totalSize);
                 //下载的文件没有名字，后缀名怎么办？参考http报头Content-Disposition属性
                response.writeHead(200, {'Content-Length': totalSize, 'Content-Type': mimetype, 'Content-disposition': 'attachment; fileName=' + fileName});
                fs.createReadStream(filePath).pipe(response);
              }	  
	    }else{
              utils.assert(false,"logic err.");
	    }
          });
      }else{
        global.log.info("warning: resource not found. DB error.");
        return page404(response,"Resource not found. DB error. The user DB has not updated.");
      }
  }); 
}


function upload(response, request) {
  global.log.info("Request handler 'upload' was called.");

  var form = new formidable.IncomingForm();
  global.log.info("about to parse");
  form.parse(request, function(error, fields, files) {
    global.log.info("parsing done");

    /* Possible error on Windows systems:
       tried to rename to an already existing file */
    fs.rename(files.upload.path, "/tmp/test.png", function(err) {
      if (err) {
        fs.unlink("/tmp/test.png");
        fs.rename(files.upload.path, "/tmp/test.png");
      }
    });
    response.writeHead(200, {"Content-Type": "text/html"});
    response.write("received image:<br/>");
    response.write("<img src='/show' />");
    response.end();
  });
}

function lengOfHash(h){//hash keys length
    return Object.keys(h).length;
}

function setResourceDB(DB){
    utils.assert(lengOfHash(DB)>=0);
    resourceDB=DB;
    global.log.info("set resource DB OK.");
}

exports.about = about;
exports.downloadFile = downloadFile;
exports.setResourceDB=setResourceDB;
