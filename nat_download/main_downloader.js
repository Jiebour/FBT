var nat_client = require("./nat-client.js"),
    settings = require("./settings.js"),
    download = require("./download.js"),
    nat_client = require("./nat-client.js"),
    EventEmitter = require('events').EventEmitter,
    path = require('path');

var NATTYPE = settings.NATTYPE,
    BLOCK_SIZE = settings.BLOCK_SIZE,
    unit_delay_time = settings.unit_delay_time,
    BLOCK_IN_PART = settings.BLOCK_IN_PART,
    partsize = settings.partsize;


function check_debug_input() { // only apply in DEBUG mode
    var argv = process.argv.slice(1);// 去掉'node'就和py相同了
    var test_nat_type = null;
    if (argv.length != 2 && argv.length != 1) {
        console.log("usage: node main_downloader.js [test_nat_type]"); // 仅供测试
        process.exit(1);
    }
    if (argv.length == 2) {
        test_nat_type = parseInt(argv[1]);  // test_nat_type is int
        if ([0, 1, 2, 3].indexOf(test_nat_type) == -1) {
            console.log("test nat type should be [0,1,2,3]")
        }
    }
    return test_nat_type;
}

(function main() {

    var uid_list = [];
    var test_nat_type = null; // DEBUG=false, test_nat_type就是null
    if (settings.DEBUG) { // laike9m测试中...
        global.source_file = 'test.mp4';
        global.download_file = 'test-local.mp4';
        global.filesize = 126401476;
        global.hash = 2450791387;
        uid_list = [1, 2]; // TODO, 可供测试的机器有几个？
        test_nat_type = check_debug_input(); // DEBUG 模式下, 才需要指定test_nat_type
    }
    else {
        var argv = process.argv;
        global.source_file = argv[2];
        global.filesize = parseInt(argv[3]);
        global.hash = parseInt(argv[4]);

        var download_file = argv[5];
        var save_dir = argv[6];
        global.download_file = path.join(save_dir, download_file);

        for (var i=7; i<argv.length-2; i++) {
            uid_list.push(argv[i]); // uid is used as pool, string type
        }
    }

    global.totalblocks = parseInt((global.filesize+BLOCK_SIZE-1)/BLOCK_SIZE);
    global.totalparts = parseInt((global.filesize+partsize-1)/partsize);

    fs.open(global.download_file, "a+", function(err, fd2) {
        global.fd2 = fd2;  // fd2用a+可在文件不存在时创建, 否则无法获取fd, 同时可以断点续传
    });

    //****************************** NAT traverse START ********************************
    var socket_amount = uid_list.length;
    global.available_clients = [];
    global.traverse_complete_count = 0 // 完成穿透的socket计数, 和is_available同时更新
    for (var i = 0; i < uid_list.length; i++) {
        create_download_client(test_nat_type, uid_list[i]);
    }
    var times = 0
    var last_traverse_complete_count = 0;
    var interval_obj = setInterval(function(){
        if (times >= 3 || global.traverse_complete_count === socket_amount) {
            clearInterval(interval_obj);
            // 连续三次穿透的socket未增加或者已经全部穿透, 认为NAT穿透步骤结束
        }
        else if (global.traverse_complete_count > last_traverse_complete_count) {
            last_traverse_complete_count = global.traverse_complete_count;
            times = 0;
        }
        else {
            times++;
        }
    }, 500);

    var available_clients = global.available_clients;
    for (var i = available_clients.length-1; i >= 0; i--) {
        if (available_clients[i].is_available) {
            available_clients[i].part_queue = [];
        }
        else {
            available_clients.splice(i, 1); // 从clients列表中删除不可用的clients
        }
    }
    //****************************** NAT traverse END ********************************

    /*
    把要下载的part分配给各个可用的socket
    每个part_queue包含的parts数量有两种, more/less, more=less or less+1
    提前分配好每个client.part_queue的part数量, 然后从第一个part开始分配
    这样可以保证每一个part_queue里的partID都是连续的
     */
    var parts_less = parseInt(totalparts/available_clients.length);
    var parts_more;
    var clients_download_more_amount; // 下多parts的client数量
    if (totalparts === parts_less * available_clients.length) {
        parts_more = parts_less; // 正好分完, totalparts整除length
        clients_download_more_amount = 0;
    }else {
        clients_download_more_amount = totalparts - parts_less * available_clients.length;
        parts_more = parts_less + 1;
    }
    // 对每个client的part_queue做初始化
    for (var i=0; i < clients_download_more_amount; i++) {
        for (var j=0; j<parts_more; j++)
            available_clients[i].part_queue.push(i*parts_more+j);
    }
    for (var i=clients_download_more_amount; i < available_clients.length; i++) {
        for (var j=0; j<parts_less; j++)
            available_clients[i].part_queue.push(clients_download_more_amount+i*parts_less+j);
    }

    /****************************** Download START **********************************/
    global.download_record = [];// 记录下载过的块, download_record[blockID]=1
    global.last_download_record = [];
    global.tobe_check = [];// 记录未校验过的块, 校验通过则删除这个blockID
    global.complete_socket = 0; // 下载完了自己的part_queue的socket计数
    global.Status = EventEmitter(); // 是否下载完成.
    /************每个文件下载开一个process, 所以弄成global也没问题***********************/
    for (var i=0; i<totalblocks; i++) {
        global.tobe_check[i] = i;
    }
    global.Status.on("complete", function() {
        check(available_clients, global.tobe_check);  // 下载完成, 开始校验
    })
    available_clients.forEach(function(client) {
        download.socket_download(client.socket, client.target.ip, client.target.port);
    })

})();


function check(available_clients, tobe_check) {
    /* 下载完之后对所有block进行校验 */
    if (tobe_check.length === 0) { // 所有block都通过校验
        console.log("checking complete");
        console.timeEnd("checking");
        console.log(get_sourcefile_hash()); // TODO
        console.log(xxhash.hash(fs.readFileSync(globbal.download_file), 0xAAAA));
        setTimeout(function(){
            process.exit(0);
        }, unit_delay_time);
    }
    else {
        utils.diff_block(tobe_check, global.filesize, global.source_file, global.download_file, function(){
            tobe_check.forEach(function(blockID){
                var random_client = available_clients[Math.floor(Math.random()*available_clients.length)];
                // 校验未通过的块, 随机选择一个socket来下载
                download.download_block(random_client.socket, blockID, ip, port);
            });
            setTimeout(check(available_clients, tobe_check), 300);
        });
    }
}


function create_download_client(test_nat_type, pool) {

    // NAT type detection
    if (test_nat_type === null) {
        var python = require('child_process').spawn(settings.stun_exe);
        python.stdout.on('data', function(data) {
            var nat_type = data.toString().split(':')[1].trim();
            var nat_type_id = NATTYPE.indexOf(nat_type);
            console.log(nat_type);
            if (nat_type_id !== -1){
                var client = new nat_client.Client(nat_type, pool);
                client.request_for_connection(nat_type_id); // chat得
            }
            else {
                // 如果不是这四种NAT类型, 如何处理?
            }
        });
    }
    else { // test mode
        var client = new nat_client.Client(NATTYPE[test_nat_type], pool);
        client.request_for_connection(test_nat_type);
    }
    global.available_clients.push(client);
};

