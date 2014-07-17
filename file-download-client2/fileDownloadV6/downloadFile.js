var http = require('http');
var fs = require('fs');
var path = require('path');
var randomAccessFile = require('random-access-file');
var querystring = require('querystring');
var utils=require('../fbtUtils/fbtUtils');

// loads module and registers app specific cleanup callback...
var cleanup = require('../fbtUtils/cleanUp').Cleanup(myCleanup);

// defines app specific callback...
// place app specific cleanup code here
function myCleanup() {
  //backup download state
  saveDownloadState();
  global.log.info('My cleanup...save download state OK!');
}

//TODO 
//set by experiment
var config={ BLOCK_SIZE: 1024*1024, //1M
             MAX_HTTP_CONNECTION_CNT: 30, //100?
             MAX_DOWNLOAD_CNT: 3, //allowed download number at the same time
             STATE_FILE: path.join(__dirname, 'downloadState.json')};//set to current path

var DownloadState={DOWNLOAD_OVER: 0, DOWNLOADING: 1, CANCELED: 2, PAUSED: 3, DOWNLOAD_ERR: 4};
/* state machine
 *
                                    |  -------------------------------------|
                                   \|/                                      |
                          DOWNLOAD_OVER--------user click download again---->
                             /|\
                              | all file blocks downloaded ok
  begin file download-------->DOWNLOADING-----------user click pause----------->PAUSED-------user click resume--->
                             /|\                                                                                |
                              |                                                                                 |
                              ---------------------------------------------------------------------------------                                                                                 
 if user removes the  file download, set the download state to CANCELED.
 if error occurs while downloading, set the download state to DOWNLOAD_ERR.
*/

var fileBlocksDownloadLeft={};
var fileDownloadStates={}; //the download state of every file 
var fileDownloadQueue=[];
var fileDownloadOverCallbacks={};
var downloadProgressCallbacks={};
var downloadHttpConnectionCnt={};
var availableFileOwners={};//all file keeper are store here
var filesToSave={}; //local file to save

var currentDownloadCnt=0;
var allDownloadInfos={};//all incoming download info is here

loadDownloadState();


function fileBlocks(fileSize){  
    return Math.floor((fileSize+config.BLOCK_SIZE-1)/config.BLOCK_SIZE);
}

function loadDownloadState(){
  if (fs.existsSync(config.STATE_FILE)) {
    var data = fs.readFileSync(config.STATE_FILE);
    fileBlocksDownloadLeft = JSON.parse(data);
    global.log.info("loadSetting ok.fileBlocksDownloadLeft: "+fileBlocksDownloadLeft);
  }
}

function saveDownloadState(){
  fs.writeFileSync(config.STATE_FILE, JSON.stringify(fileBlocksDownloadLeft, null, 2));
}

/**
 * add to file download queue
 *
 * arguments:
 * fileInfo: a hash such as {file: name of the file,hash: hash of the file, size: file size}
 * fileOwners: the owner of the file, is an array such as [{host: ip1, port: port1},{host: ip2, port: port2}]
 * saveDir: the dir to save the file
 * downloadOverCallback: the callback for invoker when the file download is over
 * downloadProgressCallbacks: the download progress callback
 *
 */
function addToDownloadQueue(fileInfo, fileOwners, saveDir, downloadOverCallback, downloadProgressCallback){
  //pack all the download info into download task queue.
  utils.assert(fileInfo['size']>0);
  utils.assert(fileInfo['file'].length>0);
  utils.assert(fileInfo['hash'].length>0);
  var fileHash=fileInfo['hash'];

  utils.assert(utils.len(fileOwners)>0);        
  utils.assert(utils.isFunction(downloadOverCallback));//must provide download over callback
  utils.assert(utils.isFunction(downloadProgressCallback));//must provide download progress callback

  if(fileHash in allDownloadInfos){//already in queue
	  global.log.info("the file is already in queue:"+fileHash);
      return;
  }
  
  allDownloadInfos[fileHash]={'fileInfo': fileInfo, 'fileOwners': fileOwners, 'saveDir': saveDir, 'downloadCallback': downloadOverCallback,'progressCallback': downloadProgressCallback};
  fileDownloadQueue.push(fileHash);//add to queue

  var fileName=fileInfo['file'];
  var savedFile=path.join(saveDir,fileName);
  global.log.info("file to save local:"+savedFile);
  filesToSave[fileHash]=savedFile;

  downloadFileInQueue();
}

function downloadFileInQueue(){
  var concurrentDownloadCnt=Math.min(fileDownloadQueue.length,config.MAX_DOWNLOAD_CNT);
  global.log.info("concurrentDownloadCnt="+concurrentDownloadCnt);
  for(var i=0;i<fileDownloadQueue.length;++i){	
    var fileHash=fileDownloadQueue[i];
    if(fileHash in fileDownloadStates){//what if the file is CANCELED? 
        //the file download is processing
        //pass
        global.log.info("the file is already downloading:"+fileHash);
    }else{
        if(currentDownloadCnt<=concurrentDownloadCnt) {
            currentDownloadCnt += 1;
			global.log.info("the file is downloading:"+fileHash);
            downloadFile(fileHash);
        }else{
            //wait
            global.log.info("waiting queue to free:"+fileHash);
        }
    }
  }
}

/**
 * download a file.
 *
 * arguments:
 * fileHash: the file hash
 *
 */
function downloadFile(fileHash){
  //unpack the download info
  var downloadInfo=allDownloadInfos[fileHash];
  var fileInfo=downloadInfo['fileInfo'];
  var fileOwners=downloadInfo['fileOwners'];
  var saveDir=downloadInfo['saveDir'];
  var downloadCallback=downloadInfo['downloadCallback'];
  var downloadProgressCallback=downloadInfo['progressCallback'];

  utils.assert(fileInfo['size']>0);
  utils.assert(fileInfo['file'].length>0);
  utils.assert(fileInfo['hash'].length>0);
  //var fileHash=fileInfo['hash'];
  
  var totalBlocksNum=fileBlocks(fileInfo['size']);

  // not allowed duplicated file download
  if(fileHash in fileDownloadStates){ 
	  if(fileDownloadStates[fileHash]==DownloadState.DOWNLOAD_OVER){ //the file download has been already over
		downloadProgressCallback(totalBlocksNum,1.0); //set progress 100%
		downloadCallback(null,filesToSave[fileHash]);
		return;
	  }else if(fileDownloadStates[fileHash]==DownloadState.PAUSED){//user pause download
		return;
	  }
  }
  fileDownloadStates[fileHash]=DownloadState.DOWNLOADING;//the file is processing
  
  global.log.info('fileHash:'+fileHash);
  utils.assert(utils.len(fileOwners)>0);        
  availableFileOwners[fileHash]=fileOwners;//store the file owners
  
  var fileBlocksCnt=totalBlocksNum;
  if(fileHash in fileBlocksDownloadLeft){// useful for resume download
    //use history download blocks
    if(fileBlocksDownloadLeft[fileHash].length==0){//history download file OK
        fileDownloadStates[fileHash]=DownloadState.DOWNLOAD_OVER;
        downloadProgressCallback(totalBlocksNum,1.0); //set progress 100%
        downloadCallback(null,filesToSave[fileHash]);
        removeFileDownloadFromQueue(fileHash);
        downloadFileInQueue();
        return;
    }else{//history download
        global.log.info("discover history download...");
        var progress=(1-fileBlocksDownloadLeft[fileHash].length/totalBlocksNum).toFixed(2); //%.2f
        var downloadedBlocks=totalBlocksNum-fileBlocksDownloadLeft[fileHash].length;
        utils.assert(downloadedBlocks>=0 && progress>=0);
        downloadProgressCallback(downloadedBlocks,progress);//report progress
    }
  }else{//new download
    fileBlocksDownloadLeft[fileHash]=utils.range(0,fileBlocksCnt);//record the download state
  }
  downloadHttpConnectionCnt[fileHash]=0;//every download task used socket is init 0

  utils.assert(utils.isFunction(downloadCallback));//must provide callback
  utils.assert(utils.isFunction(downloadProgressCallback));//must provide callback
  fileDownloadOverCallbacks[fileHash]=downloadCallback;
  downloadProgressCallbacks[fileHash]=downloadProgressCallback;
 

  fs.exists(saveDir, function(exists) {
    if (exists) {
      var savedFile=filesToSave[fileHash];
      var concurrentHttpCnt=Math.min(fileBlocksCnt,config.MAX_HTTP_CONNECTION_CNT);
      global.log.info("concurrentHttpCnt:"+concurrentHttpCnt);
      for(var blockID=0;blockID<concurrentHttpCnt;++blockID){

        downloadBlock(fileInfo,savedFile,blockID);
      }    
    } else {
      //utils.assert(false,"file save dir not exist:"+saveDir);
      global.log.info("file save dir not exist:"+saveDir);
      fileDownloadOverCallbacks[fileHash]("saved file dir not exist.",null);//download file failed
      utils.assert(currentDownloadCnt>=0);
    }
  });         
}


function downloadBlock(fileInfo,localFile,blockID){   
    var fileHash=fileInfo['hash'];
    //utils.assert(fileHash in fileDownloadStates);
	if(!(fileHash in fileDownloadStates)){//file download canceled		
        global.log.info('file download pause or canceled...');
		return;
	}
    switch(fileDownloadStates[fileHash]){
          case DownloadState.PAUSED://file download pause
          //case DownloadState.CANCELED://file download canceled
            global.log.info('file download paused...');
            return;
          case DownloadState.DOWNLOADING://file download canceled
            break;
          case DownloadState.DOWNLOAD_OVER://file download canceled
          case DownloadState.DOWNLOAD_ERR://file download canceled
          default:
            utils.assert("logic error");
    }


    utils.assert(fileHash in fileBlocksDownloadLeft && fileHash in availableFileOwners);    
    var fileDownloadCallback= fileDownloadOverCallbacks[fileHash];
    var downloadProgressCallback=downloadProgressCallbacks[fileHash];
    var fileOwners=availableFileOwners[fileHash];
    if(fileOwners.length ==0){
       utils.assert(fileBlocksDownloadLeft[fileHash].length > 0);//must download fail
       fileDownloadCallback('file download error! No fileOwners!');
       fileDownloadStates[fileHash]=DownloadState.DOWNLOAD_ERR;
       removeFileDownloadFromQueue(fileHash); //if download error download next file
       downloadFileInQueue();
       return;
    }

    var owner=utils.randomChoose(fileOwners);//random choose the file keeper. what if the owner is invalid???
    utils.assert('host' in owner && 'port' in owner);

    var fileSize=fileInfo['size'];
    var totalBlocksNum=fileBlocks(fileSize);    
    if(blockID >= totalBlocksNum) return;
    
    var start=blockID*config.BLOCK_SIZE;
    var end=blockID*config.BLOCK_SIZE+config.BLOCK_SIZE-1;
    if(end >= fileSize ) end=fileSize-1;

    var options = {
      hostname: owner['host'],
      port: owner['port'],
      path: '/download?'+ querystring.stringify(fileInfo),//use hash of the file to identify the file
      method: 'GET',
      headers: {"Range": start+"-"+end}
    };
        
    var chunks=[];
    var httpWritingStream=http.get(options, function(response) {
      response.on('data', function (chunk) {
        chunks.push(chunk);
      });
      
      var errorOccur=0;
      response.on('error', function (err) {
        errorOccur=1;
      });
      
      response.on('close', function () {// event emit when the server has stopped! may not follow with end event!
        global.log.info('**************close ....');
        if(errorOccur){
          global.log.info("http get response err:"+err+" I will remove the invalid file owner. IP:"+owner['host']+" port:"+owner['port']);
          global.log.info('fileHash:'+fileHash+ ' remove ower:'+owner);
          utils.removeArrayItem(availableFileOwners[fileHash],owner);//this file owner is invalid        
          downloadBlock(fileInfo,localFile,blockID);//go on download this block
        }
      });
      
      response.on('end', function () {// event emit when all data has come out!
        //I guess the main time consuming logic is here
		if(!(fileHash in fileDownloadStates)){//file download canceled		
			global.log.info('file download pause or canceled...');
			return;
		}
        switch(fileDownloadStates[fileHash]){
          case DownloadState.PAUSED://file download pause
          //case DownloadState.CANCELED://file download canceled
            global.log.info('file download paused...');
            return;
          case DownloadState.DOWNLOADING://file download canceled
            break;
          case DownloadState.DOWNLOAD_OVER://file download canceled
          case DownloadState.DOWNLOAD_ERR://file download canceled
          default:
            utils.assert("logic error");
        }

        var chunksData=Buffer.concat(chunks);
        if(response.statusCode==404){
          global.log.info('Warning: 404 page found. '+chunksData);
          global.log.info('fileHash:'+fileHash+ ' remove ower:'+owner);
          utils.removeArrayItem(availableFileOwners[fileHash],owner);//this file owner is invalid
          downloadBlock(fileInfo,localFile,blockID);//go on download this block
        }else{
          utils.assert(response.statusCode==206 || response.statusCode==200);
          utils.assert(chunks.length <= config.BLOCK_SIZE);  
          var file = randomAccessFile(localFile); 
          file.write(blockID*config.BLOCK_SIZE, chunksData,
              function(err) {
                  file.close();//TODO
				  if(!(fileHash in fileDownloadStates)){//file download canceled		
					  global.log.info('file download canceled...');
					  return;
				  }
                  switch(fileDownloadStates[fileHash]){//I guess the main time consuming logic is here too
					          case DownloadState.PAUSED://file download pause
					          //case DownloadState.CANCELED://file download canceled
					            global.log.info('file download paused...');
					            return;
					          case DownloadState.DOWNLOADING://file download canceled
					            break;
					          case DownloadState.DOWNLOAD_OVER://file download canceled
                              case DownloadState.DOWNLOAD_ERR://file download canceled
					          default:
					            utils.assert("logic error");
					        }

                  if(err){
                    fileDownloadStates[fileHash]=DownloadState.DOWNLOAD_ERR;
                    fileDownloadCallback(err);// to gui!
                  }else{                    
                    utils.removeArrayItem(fileBlocksDownloadLeft[fileHash],blockID);//what if the user cancel the request
                    global.log.info("blockID download OK:"+blockID);
                    var progress=(1-fileBlocksDownloadLeft[fileHash].length/totalBlocksNum).toFixed(2); //%.2f
                    var downloadedBlocks=totalBlocksNum-fileBlocksDownloadLeft[fileHash].length;
                    utils.assert(downloadedBlocks>0 && progress>=0);
                    downloadProgressCallback(downloadedBlocks,progress);//report progress
                    //download over
                    if(fileBlocksDownloadLeft[fileHash].length == 0){ //the ony one gateway if download successfully
                      fileDownloadStates[fileHash]=DownloadState.DOWNLOAD_OVER;//the file download is over
                      fileDownloadCallback(null,filesToSave[fileHash]);
                      removeFileDownloadFromQueue(fileHash);
                      downloadFileInQueue();
                      return;
                    }
                    var nextBlockID=blockID+config.MAX_HTTP_CONNECTION_CNT;
                    if(nextBlockID<totalBlocksNum){
                      global.log.info("download nextBlockID:"+nextBlockID);
                      downloadBlock(fileInfo,localFile,nextBlockID);                               
                    }
                  }
              }
           );
        }
      });
    });
     
     httpWritingStream.on('error',function requestError(err){
      //handle error if server not connect
      global.log.info("request error:"+err+". I will remove the invalid ower:"+owner['host']+" ip:"+owner['port']);
      global.log.info('fileHash:'+fileHash+ ' remove ower:'+owner);
      utils.removeArrayItem(availableFileOwners[fileHash],owner);//this file owner is invalid
      downloadBlock(fileInfo,localFile,blockID);//go on download this block
    });
}

/**
 * remove file download from queue, delete downloaded file at the same time.
 *
 * fileHash: hash of file to remove from download queue
 * callback: callback when complete
 */
function removeFileDownload(fileHash, callback){
  utils.assert(fileHash.length>0 && utils.isFunction(callback));
  if(fileHash in fileDownloadStates){
    //fileDownloadStates[fileHash]=DownloadState.CANCELED;
	delete fileDownloadStates[fileHash];
    delete fileBlocksDownloadLeft[fileHash];
    removeFileDownloadFromQueue(fileHash);
    removeFileInSaveDir(fileHash,callback);
  }
  //else ???? is there a bug???
}

function removeFileDownloadFromQueue(fileHash){
  if(fileHash in allDownloadInfos){
      utils.removeArrayItem(fileDownloadQueue,fileHash);
      delete allDownloadInfos[fileHash];
      currentDownloadCnt-=1;
      if(currentDownloadCnt < 0) currentDownloadCnt=0;
      utils.assert(currentDownloadCnt>=0);
  }
  global.log.info("free a file download in queue....");
}

function removeFileInSaveDir(fileHash,callback){//BUG FIXME... user if want to delete history file, he can not do this.
  if(fileHash in filesToSave){
    var file=filesToSave[fileHash];
    fs.unlink(file, function (err) {
      if (err)  {
        global.log.info("del file err:"+err);
        callback(err);
      }else{
        global.log.info('successfully deleted file:'+file+" fileHash:"+fileHash);
        callback(null);
      }
      delete filesToSave[fileHash];
    });
  }
  //else{
  //  global.log.info("file not in download queue:"+fileHash);
  // callback(null);
  //}
  //else ???? is there a bug???
}


/**
 * pause a file download
 *
 * fileHash: hash of file
 */
function pauseFileDownload(fileHash){
  if(fileHash in fileDownloadStates && fileDownloadStates[fileHash]==DownloadState.DOWNLOADING){
      fileDownloadStates[fileHash]=DownloadState.PAUSED;
  }
}


/**
 * resume a file download
 *
 * fileHash: hash of file
 */
function resumeFileDownload(fileHash){
  if(fileHash in fileDownloadStates && fileDownloadStates[fileHash]==DownloadState.PAUSED){
      fileDownloadStates[fileHash]=DownloadState.DOWNLOADING;
      downloadFile(fileHash);
  }
}


exports.addToDownloadQueue=addToDownloadQueue;
exports.pauseFileDownload=pauseFileDownload;
exports.resumeFileDownload=resumeFileDownload;
exports.removeFileDownload=removeFileDownload;
