var nat_client = require("./nat-client.js"),
    settings = require("./settings.js");
var NATTYPE = settings.NATTYPE;

/*
 目前仅测试一对一的传输, 实际中得用uid_list中的每个值连一遍
 实际中, uid_list应该是在之前就已经得到的, 这里假定已知
 测试2v1时array中应该有两个值
 */
function get_uid_list() {
   return [1];
}

uid_list = get_uid_list();


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

var test_nat_type = check_input();
for (var i=0; i<uid_list.length; i++)
    main(test_nat_type, uid_list[i]);


function main(test_nat_type, pool) {
    if (test_nat_type === null) {
        var python = require('child_process').spawn(
            settings.stun_exe
        );
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
    else { // 假装正在测试某种类型的NAT, 在check_input中已被限定为0-3
        var client = new nat_client.Client(NATTYPE[test_nat_type], pool);
        client.request_for_connection(test_nat_type);
    }
};
