/**
 * Created by fbt on 14-7-16.
 */

// loads module and registers app specific cleanup callback...
var cleanup = require('../fbtUtils/cleanUp').Cleanup(myCleanup);
var fs = require('fs');
var path = require('path');
var utils =require('../fbtUtils/fbtUtils');

var config={SETTING_FILE: path.join(__dirname, 'setting.json')};//set to current path
//var setting={};//not work
global.setting={};//must use global variable
loadSetting();

// defines app specific callback...
// place app specific cleanup code here
function myCleanup() {
  //backup download state
  saveSetting();
  //global.log.info('My cleanup...save setting file!');
}


function loadSetting(){
  if (fs.existsSync(config.SETTING_FILE)) {
    var data = fs.readFileSync(config.SETTING_FILE);
    global.setting = JSON.parse(data);
    //global.log.info("loadSetting ok. settings: "+setting);
  }else{//default download dir
    var defaultDownloadDir=path.join(utils.getUserHome(),"FBTDownload");
    global.setting["downloadSaveDir"]=defaultDownloadDir;
    if(!fs.existsSync(defaultDownloadDir)){//mkdir if not exist
        try{
            fs.mkdirSync(defaultDownloadDir);
        }catch(e) {//pass error
        }
    }
  }
}

function saveSetting(){
  fs.writeFileSync(config.SETTING_FILE, JSON.stringify(global.setting, null, 2));
}

//exports.setting=setting;