__author__ = 'bone-lee'

import ipaddress as IP
from user_ip_cache import UserIPCache
from resources_cache import ResourcesCache
from http_server_info_cache import HttpServerInfoCache


class DownloadMedium(object):
    @classmethod
    def get_online_user_cnt(cls,file_hash):
        return len(filter(UserIPCache.user_online, ResourcesCache.get_resource_owners(file_hash)))

    @classmethod
    def get_online_file_owner(cls, my_uid, file_hash):
        assert len(file_hash) > 0
        assert my_uid >= 0
        online_owners = filter(UserIPCache.user_online, ResourcesCache.get_resource_owners(file_hash))
        # if online_owners.count(my_uid): # remove myself
        #    online_owners.remove(my_uid)
        if (UserIPCache.user_online(my_uid)):
            my_ip = UserIPCache.get_user_ip(my_uid)
            is_ipv4 = IP.is_valid_ipv4_address(my_ip)
            if is_ipv4:
                same_ip_users = filter(lambda user: UserIPCache.get_user_ip(user) == my_ip, online_owners)
                v4_owners = [user for user in same_ip_users if
                             IP.is_valid_ipv4_address(HttpServerInfoCache.get_user_ipv4(user))]
                grep_owners = [{"uid": user, "host": HttpServerInfoCache.get_user_ipv4(user), "port": 8884} for user in
                               v4_owners]
                return grep_owners
            else:
                v6_owners = [user for user in online_owners if
                             IP.is_valid_ipv6_address(HttpServerInfoCache.get_user_ipv6(user))]
                grep_owners = [{"uid": user, "host": HttpServerInfoCache.get_user_ipv6(user), "port": 8886} for user in
                               v6_owners]
                return grep_owners
        else:
            return []