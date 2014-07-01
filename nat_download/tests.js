var totalparts = 100;
var available_clients = Array(12);

for (var i=0; i<available_clients.length; i++){
    available_clients[i] = {};
    available_clients[i].part_queue = [];
}


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
// 对每个client的part_queue做初始化, 待测试
for (var i=0; i < clients_download_more_amount; i++) {
    for (var j=0; j<parts_more; j++)
        available_clients[i].part_queue.push(i*parts_more+j);
}
for (var i=clients_download_more_amount; i < available_clients.length; i++) {
    for (var j=0; j<parts_less; j++)
        available_clients[i].part_queue.push(clients_download_more_amount+i*parts_less+j);
}

console.log(available_clients);