/**
 * Created by fbt on 14-7-12.
 */
var fbtV6Server = require('./run');

//fbtV6Server.start({fbtHost: '192.168.1.101', fbtPort: 8888, fbtUser: 'bone'});
var DB={
         // "123":"../my-share/sample.zip",
        //  "456":"../my-share/fav.mp3",
         // "789":"F:/node-webkit-bin/my-sample/my-share/stallman.jpg",
          "0":"/home/bone-lee/share/labview.avi",
          "111":"/home/bone-lee/install_file/jdk1.6.0_21.tar.gz",
          "11":"/home/bone-lee/install_file/tex-trans.pdf",
          "1":"/home/bone-lee/install_file/cppunit-1.12.1.tar.gz",
          "2":"/home/bone-lee/hs_err_pid9844.log",
          //"3":"./server.js",
  };


fbtV6Server.start({fbtHost: '128.199.222.27', fbtPort: 8888, fbtUser: 112, resourceDB: DB});
