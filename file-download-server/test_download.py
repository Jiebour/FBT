__author__ = 'bone-lee'

import ipaddress as IP
from user_ip_cache import UserIPCache
from resources_cache import ResourcesCache
from http_server_info_cache import HttpServerInfoCache
from download_medium import DownloadMedium

def test_download():
    UserIPCache.update_my_ip(1,"1.1.1.1")

    UserIPCache.update_my_ip(2,"2.2.2.2")
    UserIPCache.update_my_ip(3,"2.2.2.2")
    UserIPCache.update_my_ip(4,"2.2.2.2") #2,3,4 are the same IP

    UserIPCache.update_my_ip(5,"2:2:2::2")
    UserIPCache.update_my_ip(6,"2:2:2::3")

    UserIPCache.update_my_ip(7,"5:2:2::3")
    UserIPCache.update_my_ip(8,"5:4:2::3")

    HttpServerInfoCache.update_ipv4_address(1,'192.168.1.101')

    HttpServerInfoCache.update_ipv4_address(2,'192.168.1.103')
    HttpServerInfoCache.update_ipv4_address(3,'192.168.1.104')
    HttpServerInfoCache.update_ipv4_address(4,'192.168.1.105')

    HttpServerInfoCache.update_ipv6_address(5,'2:2:2::2')
    HttpServerInfoCache.update_ipv6_address(6,'2:2:2::3')

    HttpServerInfoCache.update_ipv6_address(7,"5:2:2::3") #7,8 are the same IP
    HttpServerInfoCache.update_ipv6_address(8,"5:4:2::3")

    # user 2,3,4 uploaded the same file
    ResourcesCache.user_upload_resource(2,"user2","file_hash2","test2.txt",1023,1,"test",0,1,3,"user2 uploaded file")
    ResourcesCache.user_upload_resource(3,"user3","file_hash2","test2.txt",1023,1,"test",0,1,3,"user3 uploaded file")
    ResourcesCache.user_upload_resource(4,"user4","file_hash2","test2.txt",1023,1,"test",0,1,3,"user4 uploaded file")

    # user 3,4 uploaded the same file
    ResourcesCache.user_upload_resource(3,"user3","file_hash3","test4.txt",1023,1,"test",0,1,3,"user3 uploaded file")
    ResourcesCache.user_upload_resource(4,"user4","file_hash3","test4.txt",1023,1,"test",0,1,3,"user4 uploaded file")

    # user 5,6,7 uploaded the same file
    ResourcesCache.user_upload_resource(5,"user5","file_hash5","test5.txt",10123,1,"test",0,1,3,"user5 uploaded file")
    ResourcesCache.user_upload_resource(6,"user6","file_hash5","test5.txt",10123,1,"test",0,1,3,"user6 uploaded file")
    ResourcesCache.user_upload_resource(7,"user7","file_hash5","test5.txt",10123,1,"test",0,1,3,"user7 uploaded file")

    assert DownloadMedium.get_online_file_owner(1,"file_hash2") == []
    assert DownloadMedium.get_online_file_owner(1,"file_hash5") == []
    assert DownloadMedium.get_online_file_owner(1,"file_hash_not_exist") == []

    assert DownloadMedium.get_online_file_owner(8,"file_hash_not_exist") == []
    assert DownloadMedium.get_online_file_owner(8,"file_hash2") == []

    assert DownloadMedium.get_online_file_owner(2,"file_hash3") == [{"uid": 3, "host": '192.168.1.104', "port":8884},{"uid": 4, "host": '192.168.1.105', "port":8884}]
    assert DownloadMedium.get_online_file_owner(8,"file_hash5") == [{"uid": 5, "host": '2:2:2::2', "port":8886},{"uid": 6, "host": '2:2:2::3', "port":8886},{"uid": 7, "host": "5:2:2::3", "port":8886}]

#if __name__ == "__main__":
#    test_download()