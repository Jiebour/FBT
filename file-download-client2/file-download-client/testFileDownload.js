//all tests passed!
//I will add to mocha tests!
var fileDownload = require('./fileDownloadV6/downloadFile.js');
var path = require('path');

//testDownloadNormally();

//Remember to rm data/download-state.json
//testInvalidDownloadIP();

//testDuplicatedDownload();
//testResumeDownload();
//testCancelDownload();
//testContineousDownload();
testMultiDownload();

function testDownloadNormally() {
    var remoteFile = 'labview.avi';
    var fileSize = 52013704;//439355;
    var fileHash = '0';
    var fileInfo = {file: remoteFile, size: fileSize, hash: fileHash};
    var fileOwners = [
        {host: '192.168.1.101', port: 8884}
    ];
    var saveDir = path.join(__dirname, 'downloads');
    var downloadCallback = function (err, savedPostion) {
        if (err) {
            console.log("err in file download:" + err);
        } else {
            console.log("file download success. save to " + savedPostion);
        }
    };
    var downloadProgressCallback = function (downloadedBlocks, progress) {
        console.log("downloadedBlocks: " + downloadedBlocks + " progress:" + progress);
    };
    fileDownload.addToDownloadQueue(fileInfo, fileOwners, saveDir, downloadCallback, downloadProgressCallback);
    //fileDownload.downloadFile(fileHash);
}

function testInvalidDownloadIP() {
    function rand3() {
        //Return a random number between 1 and 3:
        return Math.floor((Math.random() * 3) + 1);
    }

    var remoteFile = 'labview.avi';
    var fileSize = 52013704;//439355;
    var fileHash = '0';
    var fileInfo = {file: remoteFile, size: fileSize, hash: fileHash};
    var fileOwners = [
        {host: '192.168.1.101', port: 8884},
        {host: '127.0.0.1', port: 8886 + rand3()},//invalid ip and port
        {host: '127.0.0.3', port: 8886 + rand3()},
        {host: '127.0.0.3', port: 888 + rand3()},
        {host: '127.0.0.3', port: 8889 + rand3()},
        {host: '127.0.0.3', port: 8888 + rand3()},
        {host: '127.0.0.3', port: 8887 + rand3()},
        {host: '127.0.0.2', port: 8886}
    ];
    var saveDir = path.join(__dirname, 'downloads');


    var downloadCallback = function (err, savedPostion) {
        if (err) {
            console.log("err in file download:" + err);
        } else {
            console.log("file download success. save to " + savedPostion);
        }
    };

    var downloadProgressCallback = function (downloadedBlocks, progress) {
        console.log("downloadedBlocks: " + downloadedBlocks + " progress:" + progress);
    };
    fileDownload.addToDownloadQueue(fileInfo, fileOwners, saveDir, downloadCallback, downloadProgressCallback);

    //fileDownload.downloadFile(fileHash);
}


function testDuplicatedDownload() {
    var remoteFile = 'labview.avi';
    var fileSize = 52013704;//439355;
    var fileHash = '0';
    var fileInfo = {file: remoteFile, size: fileSize, hash: fileHash};
    var fileOwners = [
        {host: '192.168.1.101', port: 8884}
    ];
    var saveDir = path.join(__dirname, 'downloads');
    var downloadCallback = function (err, savedPostion) {
        if (err) {
            console.log("err in file download:" + err);
        } else {
            console.log("file download success. save to " + savedPostion);
        }
    };
    var downloadProgressCallback = function (downloadedBlocks, progress) {
        console.log("downloadedBlocks: " + downloadedBlocks + " progress:" + progress);
    };
    fileDownload.addToDownloadQueue(fileInfo, fileOwners, saveDir, downloadCallback, downloadProgressCallback);
    //fileDownload.downloadFile(fileHash);
    setTimeout(function () {
        console.log("duplicated file download...");
        fileDownload.addToDownloadQueue(fileInfo, fileOwners, saveDir, downloadCallback, downloadProgressCallback);
        //fileDownload.downloadFile(fileHash);
    }, 10000);
}

function testCancelDownload() {
    var remoteFile = 'labview.avi';
    var fileSize = 52013704;//439355;
    var fileHash = '0';
    var fileInfo = {file: remoteFile, size: fileSize, hash: fileHash};
    var fileOwners = [
        {host: '192.168.1.101', port: 8884}
    ];
    var saveDir = path.join(__dirname, 'downloads');
    var downloadCallback = function (err, savedPostion) {
        if (err) {
            console.log("err in file download:" + err);
        } else {
            console.log("file download success. save to " + savedPostion);
        }
    };
    var downloadProgressCallback = function (downloadedBlocks, progress) {
        console.log("downloadedBlocks: " + downloadedBlocks + " progress:" + progress);
    };
    fileDownload.addToDownloadQueue(fileInfo, fileOwners, saveDir, downloadCallback, downloadProgressCallback);
    //fileDownload.downloadFile(fileHash);
    setTimeout(function () {
        console.log("***********cancel file download...");
        fileDownload.removeFileDownload(fileHash, function (err) {
            if (!err)console.log("cancel OK!");
        });
    }, 3000);
}


function testResumeDownload() {
    var remoteFile = 'labview.avi';
    var fileSize = 52013704;//439355;
    var fileHash = '0';
    var fileInfo = {file: remoteFile, size: fileSize, hash: fileHash};
    var fileOwners = [
        {host: '192.168.1.101', port: 8884}
    ];
    var saveDir = path.join(__dirname, 'downloads');
    var downloadCallback = function (err, savedPostion) {
        if (err) {
            console.log("err in file download:" + err);
        } else {
            console.log("file download success. save to " + savedPostion);
        }
    };
    var downloadProgressCallback = function (downloadedBlocks, progress) {
        console.log("downloadedBlocks: " + downloadedBlocks + " progress:" + progress);
    };
    fileDownload.addToDownloadQueue(fileInfo, fileOwners, saveDir, downloadCallback, downloadProgressCallback);
    //fileDownload.downloadFile(fileHash);
    setTimeout(function () {
        console.log("***********pause file download...");
        fileDownload.pauseFileDownload(fileHash);
        setTimeout(function () {
            console.log("***********resume file download...");
            fileDownload.resumeFileDownload(fileHash);
        }, 5000);
    }, 3000);
}

function testContineousDownload() {
    {
        var remoteFile = 'labview.avi';
        var fileSize = 52013704;//439355;
        var fileHash = '0';
        var fileInfo = {file: remoteFile, size: fileSize, hash: fileHash};
        var fileOwners = [
            {host: '192.168.1.101', port: 8884}
        ];
        var saveDir = path.join(__dirname, 'downloads');
    }

    {
        var remoteFile2 = "jdk1.6.0_21.tar.gz";
        var fileSize2 = 101611762;//439355;
        var fileHash2 = '111';
        var fileInfo2 = {file: remoteFile2, size: fileSize2, hash: fileHash2};
        var fileOwners2 = [
            {host: '192.168.1.101', port: 8884}
        ];
        var saveDir2 = path.join(__dirname, 'downloads');
    }

    var downloadCallback = function (err, savedPostion) {
        if (err) {
            console.log("err in file download:" + err);
        } else {
            console.log("file download success. save to " + savedPostion);
        }
    };
    var downloadProgressCallback = function (downloadedBlocks, progress) {
        console.log("downloadedBlocks: " + downloadedBlocks + " progress:" + progress);
    };

    fileDownload.addToDownloadQueue(fileInfo, fileOwners, saveDir, downloadCallback, downloadProgressCallback);
    fileDownload.addToDownloadQueue(fileInfo2, fileOwners2, saveDir2, downloadCallback, downloadProgressCallback);
}


function testMultiDownload() {
    {
        var remoteFile = 'labview.avi';
        var fileSize = 52013704;//439355;
        var fileHash = '0';
        var fileInfo = {file: remoteFile, size: fileSize, hash: fileHash};
        var fileOwners = [
            {host: '192.168.1.101', port: 8884}
        ];
        var saveDir = path.join(__dirname, 'downloads');
    }

    {
        var remoteFile2 = "jdk1.6.0_21.tar.gz";
        var fileSize2 = 101611762;//439355;
        var fileHash2 = '111';
        var fileInfo2 = {file: remoteFile2, size: fileSize2, hash: fileHash2};
        var fileOwners2 = [
            {host: '192.168.1.101', port: 8884}
        ];
        var saveDir2 = path.join(__dirname, 'downloads');
    }

    {
        var remoteFile3 = "hs_err_pid9844.log";
        var fileSize3 = 78076;//439355;
        var fileHash3 = '2';
        var fileInfo3 = {file: remoteFile3, size: fileSize3, hash: fileHash3};
        var fileOwners3 = [
            {host: '192.168.1.101', port: 8884}
        ];
        var saveDir3 = path.join(__dirname, 'downloads');
    }

    {
        var remoteFile4 = "tex-trans.pdf";
        var fileSize4 = 127960;//439355;
        var fileHash4 = '11';
        var fileInfo4 = {file: remoteFile4, size: fileSize4, hash: fileHash4};
        var fileOwners4 = [
            {host: '192.168.1.101', port: 8884}
        ];
        var saveDir4 = path.join(__dirname, 'downloads');
    }

    {
        var remoteFile5 = "cppunit-1.12.1.tar.gz";
        var fileSize5 = 762803;//439355;
        var fileHash5 = '1';
        var fileInfo5 = {file: remoteFile5, size: fileSize5, hash: fileHash5};
        var fileOwners5 = [
            {host: '192.168.1.101', port: 8884}
        ];
        var saveDir5 = path.join(__dirname, 'downloads');
    }
    var downloadCallback = function (err, savedPostion) {
        if (err) {
            console.log("err in file download:" + err);
        } else {
            console.log("file download success. save to " + savedPostion);
        }
    };
    var downloadProgressCallback = function (downloadedBlocks, progress) {
        console.log("downloadedBlocks: " + downloadedBlocks + " progress:" + progress);
    };

    fileDownload.addToDownloadQueue(fileInfo, fileOwners, saveDir, downloadCallback, downloadProgressCallback);
    fileDownload.addToDownloadQueue(fileInfo3, fileOwners3, saveDir3, downloadCallback, downloadProgressCallback);
    fileDownload.addToDownloadQueue(fileInfo4, fileOwners4, saveDir4, downloadCallback, downloadProgressCallback);
    fileDownload.addToDownloadQueue(fileInfo5, fileOwners5, saveDir5, downloadCallback, downloadProgressCallback);
    fileDownload.addToDownloadQueue(fileInfo2, fileOwners2, saveDir2, downloadCallback, downloadProgressCallback);
}