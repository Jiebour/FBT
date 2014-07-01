var nat_client = require("./nat-client.js"),
    settings = require("./settings.js");
var NATTYPE = settings.NATTYPE;


var BLOCK_SIZE = settings.BLOCK_SIZE,
    source_file = settings.source_file,
    download_file = settings.download_file,
    filesize = settings.filesize,
    unit_delay_time = settings.unit_delay_time,
    BLOCK_IN_PART = settings.BLOCK_IN_PART;

var totalblocks = parseInt((filesize+BLOCK_SIZE-1)/BLOCK_SIZE);
var partsize = BLOCK_IN_PART * BLOCK_SIZE;
var totalparts = parseInt((filesize+partsize-1)/partsize);

var download_record = [],// 记录下载过的块, download_record[blockID]=1
    last_download_record = [],
    tobe_check = [];  // 记录未校验过的块, 校验通过则删除这个blockID


/*
 目前仅测试一对一的传输, 实际中得用uid_list中的每个值连一遍
 实际中, uid_list应该是在之前就已经得到的, 这里假定已知
 测试2v1时array中应该有两个值
 */
function get_uid_list() {
   return [1];
}


function check_input() {
    var argv = process.argv.slice(1);// 去掉'node'就和py相同了
    var test_nat_type = null;
    if (argv.length != 2 && argv.length != 1) {
        console.log("usage: node main.js [test_nat_type]"); // 现在只有一个参数(测试NAT类型)或者无参数
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
    uid_list = get_uid_list();
    var test_nat_type = check_input();
    fs.open(settings.download_file, "a+", function(err, fd2) {
        global.fd2 = fd2;  // fd2用a+可在文件不存在时创建, 否则无法获取fd, 同时可以断点续传
    });
    var available_clients = [];
    for (var i = 0; i < uid_list.length; i++) {
        var client = create_download_client(test_nat_type, uid_list[i]);
        if (client.is_available) {
            client.part_queue = [];
            available_clients.push(client);
        }
        /*
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
    }
})();

function create_download_client(test_nat_type, pool) {

    var socket_amount = uid_list.length;
    global.traverse_complete_count = 0

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
    var times = 0
    var last_traverse_complete_count = 0;
    var interval_obj = setInterval(function(){
        if (times >= 3 || global.traverse_complete_count === socket_amount) {
            clearInterval(interval_obj);
            // 连续三次穿透的socket未增加或者已经全部穿透, 开始数据传输
            return client;
        }
        else if (global.traverse_complete_count > last_traverse_complete_count) {
            last_traverse_complete_count = global.traverse_complete_count;
            times = 0;
        }
        else {
            times++;
        }
    }, 500);
};


