__author__ = 'bone-lee'


class HttpServerInfoCache(object):
    _http_server_info = dict()  # such as {fbt_user1: {ipv4:xxx.xxx.xxx.xxx, ipv6: xx:xx:xx:xx},fbt_user2:{ipv4:xxx,ipv6:xxx}}

    @classmethod
    def update_ipv4_address(cls, user, ip):
        assert user >= 0
        if user in cls._http_server_info:
            cls._http_server_info[user]["ipv4"] = ip
        else:
            cls._http_server_info[user] = {"ipv4": ip, "ipv6": None}

    @classmethod
    def update_ipv6_address(cls, user, ip):
        assert user >= 0
        if user in cls._http_server_info:
            cls._http_server_info[user]["ipv6"] = ip
        else:
            cls._http_server_info[user] = {"ipv6": ip, "ipv4": None}

    @classmethod
    def get_server_info(cls):
        return cls._http_server_info

    @classmethod
    def get_user_ipv4(cls, user):
        assert user >= 0
        if user in cls._http_server_info:
            return cls._http_server_info[user]["ipv4"]
        else:
            return None

    @classmethod
    def get_user_ipv6(cls, user):
        assert user >= 0
        if user in cls._http_server_info:
            return cls._http_server_info[user]["ipv6"]
        else:
            return None