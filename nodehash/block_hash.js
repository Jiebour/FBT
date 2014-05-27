var xxhash = require('xxhash')
  , fs = require('fs')
  , path = require('path')
  , Datastore = require('nedb')
  , db = new Datastore({ filename: 'nedb_data/nedb.data', autoload: true });

filepath = 'files/62051.mp4'

var readable = fs.createReadStream(filepath),
    filesize = fs.statSync(filepath)['size'],
    M = 1024 * 1024, flag = 0;

var count = 0, oneMdata;
readable.on('readable', function() {
    while ((filesize - count * M > M)) {
        if (null == (oneMdata=readable.read(1024)))  //异步读取
            continue;
        else {
            count ++;
            flag = 1;
            console.log(count);
        }
    }
    if (flag) {  // 只要是readable的状态就会进入function, 所以必须限制使得读取完成之后回调函数不再起作用
        flag = 0;
        oneMdata = readable.read();
        console.log(++count);
        console.log(oneMdata.length);
    }
});
