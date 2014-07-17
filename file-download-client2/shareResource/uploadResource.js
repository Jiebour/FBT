/**
 * Created by fbt on 14-7-9.
 */

var utils = require('../fbtUtils/fbtUtils');
var http = require('http');
var fs = require('fs');
var path = require('path');
var querystring = require('querystring');
//var Log = require('log')
//  , log = new Log('debug',fs.createWriteStream(path.join(__dirname,'fbt.log')));

//log.info('sending email', {'test': 'test'});
//log.error('failed to send email');
//log.debug('preparing');

var resourceDB={};
var config={RESOURCE_INFO_FILE: path.join(__dirname, 'resourceInfo.json')};


loadResourceInfo();

// loads module and registers app specific cleanup callback...
var cleanup = require('../fbtUtils/cleanUp').Cleanup(myCleanup);

// defines app specific callback...
// place app specific cleanup code here
function myCleanup() {
  //backup download state
  saveResouceInfo();
  global.log.info('My cleanup...save download state OK!');
}

function loadResourceInfo(){
  if (fs.existsSync(config.RESOURCE_INFO_FILE)) {
    var data = fs.readFileSync(config.RESOURCE_INFO_FILE);
    resourceDB = JSON.parse(data);
    global.log.info("load resourceDB ok. resourceDB:",resourceDB);
  }
}

function saveResouceInfo() {
  fs.writeFileSync(config.RESOURCE_INFO_FILE, JSON.stringify(resourceDB, null, 2));
}

// TODO
// FIXME
// remove me with true file hash
// see file-api
function mockFileHash(filePath,hashOKCallback) {
    //var mockHash=Date.now();//gives milliseconds since epoch.
    var hashCode = function(str) {//string hash
      var hash = 0, i, chr, len;
      if (str.length == 0) return hash;
      for (i = 0, len = str.length; i < len; i++) {
        chr   = str.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
      }
      return hash;
    };
    var mockHash=hashCode(path.basename(filePath));
    resourceDB[mockHash]=filePath;//save to json DB
    hashOKCallback(null,mockHash);
}

/***
 * upload user resource
 * @param fbtHost fbt host
 * @param fbtPort fbt port
 * @param uid user id that registered in fbt, it is a int number
 * @param filePath the  shared file's abs path
 * @param mainType file main type
 * @param subType file sub type
 * @param grade the user's grade for the resource 0-5
 * @param comment resource's comment, it should <=1000 bytes
 * @tags the tags of resource
 * @isPublic private share? or public share?
 * @param uploadStateCallback ok or error in uploading, if ok, the second argument is upload-successful file name.
 */
function uploadResource(fbtHost, fbtPort, uid, fileName, filePath, mainType, subType, grade, comment,tags,isPublic, uploadStateCallback) {
    utils.assert(fbtHost.length > 0);
    utils.assert(fbtPort > 0);
    utils.assert(uid > 0);
    utils.assert(fileName.length > 0);
    utils.assert(filePath.length > 0);
    utils.assert(mainType >= 0);
    utils.assert(subType >= 0);
    utils.assert(grade >= 0);
    var MAX_COMMENT_LEN = 1000;
    utils.assert(comment.length >= 0 && comment.length <= MAX_COMMENT_LEN);
    utils.assert(tags.length > 0);
    utils.assert(isPublic == false || isPublic==true);
    utils.assert(utils.isFunction(uploadStateCallback));

    // judge file exist
    // if file exist:
    //   get file size and begin file hash
    //   if file hash success:
    //     upload file info to server
    //     if upload success:
    //       uploadStateCallback(null)
    //     else:
    //       uploadStateCallback("upload resource error.")
    //   else:
    //     uploadStateCallback("file hash error.")
    // else:
    //    uploadStateCallback("file not exist any more.")

    fs.exists(filePath, function (exists) {
        if (exists) {
            fs.stat(filePath, function (err, stats) {
                if (!err) {
                    var fileSize=stats.size;
                    global.log.info("file size:" + stats.size);
                    mockFileHash(filePath, function (hashErr, fileHash) {
                        //var fileName=path.basename(filePath);
                        uploadFileInfoToServer(fbtHost, fbtPort, uid, fileName,fileHash,fileSize, mainType, subType, tags, isPublic, grade, comment, uploadStateCallback);
                    });
                } else {
                    uploadStateCallback(err,fileName);
                }
            });
        } else {
            global.log.info("file save dir not exist:" + filePath);
            uploadStateCallback("file not exist:" + filePath,fileName);
        }
    });
}

function uploadFileInfoToServer(fbtHost, fbtPort, uid, fileName, fileHash,fileSize, mainType, subType,tags,isPublic, grade, comment, uploadStateCallback){
    //utils.assert(fileHash.length > 0);

    // URL:
    // http://localhost:8888/upload_resource?
    // user=4&
    // file_name=changed.txt&
    // file_hash=TODO2&
    // file_size=1023&
    // blocks_hash=1%202%203&
    // tags=test1%20test2&
    // main_type=5&sub_type=5&
    // res_grade=3.2&
    // comment=kaka&
    // is_public=0

    var uploadInfo={'user':uid,
        'file_name': fileName, 'file_hash': fileHash, 'file_size': fileSize,
        'tags':tags,
        'main_type': mainType,'sub_type':subType,
        'res_grade':grade,
        'comment': comment,
        'is_public': isPublic? 1:0};

    var options = {
        hostname: fbtHost,
        port: fbtPort,
        path: '/upload_resource?' + querystring.stringify(uploadInfo),//use hash of the file to identify the file
        method: 'GET'
    };

    var chunks = [];
    var httpWritingStream = http.get(options, function (response) {
        response.on('data', function (chunk) {
            chunks.push(chunk);
        });

        var errorOccur = 0;
        response.on('error', function (err) {
            errorOccur = 1;
        });

        response.on('close', function () {// event emit when the server has stopped! may not follow with end event!
            if (errorOccur) {
                uploadStateCallback("error in GET http method",fileName);
            }
        });

        response.on('end', function () {// event emit when all data has come out!
            var chunksData = Buffer.concat(chunks);
            var json=JSON.parse(chunksData);
            if('err' in json && json['err']==0){
                uploadStateCallback(null,fileName);
            }else{
                global.log.info("json err:",json);
                uploadStateCallback("json format error");
            }
        });
    });

    httpWritingStream.on('error', function requestError(err) {
        //handle error if server not connect
        global.log.info("error in http GET:"+err);
        uploadStateCallback('http request error:'+err,fileName);
    });
}

exports.uploadResource = uploadResource;
exports.resourceDB = resourceDB; //DB export for file share
