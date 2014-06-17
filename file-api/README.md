本地资源接口demo
==============

环境准备
---
1. `npm install`
2. 如果没有安装`nw-gyp`, 执行`npm install nw-gyp -g`
3. 把`xxhash`这个文件夹复制一份, 命名为`xxhash_nw`
4. 进入`xxhash_nw`, 执行`nw-gyp rebuild --target=0.8.6`

这一部分请参考[Using Node modules][1]

使用
---
打包并用`nw.exe`执行, 似乎必须得用包含所有dll的文件夹中的`nw.exe`, 只有`nw.exe`和`nw.pak`时不能正常执行  
或者直接执行打好的`file-api.zip`

程序中开了node-webkit控制台, 但不知为何不起作用。可以手动打开, 观察输出。目前所有输出均发往控制台

开发
---
大致调用路线为`main.html -> main.js -> res_api.js -> utils.js`, 不过也有`main.html`直接调用
`res_api.js`的情况


[1]: https://github.com/rogerwang/node-webkit/wiki/Using-Node-modules#3rd-party-javascript-modules
