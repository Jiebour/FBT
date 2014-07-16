__author__ = 'bone-lee'


class UserIPCache(object):
    '''
    memory user ip
    '''
    _user_ip_list = dict()  # such as {fbt_user1: 112.12.23.4,fbt_user2: 123.2.3.1}

    @classmethod
    def update_my_ip(cls, user, ip):
        assert user >= 0
        cls._user_ip_list[user] = ip

    @classmethod
    def delete_my_ip(cls, user):
        assert user >= 0
        if user in cls._user_ip_list:
            del cls._user_ip_list[user]

    @classmethod
    def get_user_ip_list(cls):
        return cls._user_ip_list

    @classmethod
    def user_online(cls, user):
        assert user >= 0
        return user in cls._user_ip_list

    @classmethod
    def get_user_ip(cls, user):
        assert user >= 0
        if user in cls._user_ip_list:
            return cls._user_ip_list[user]
        else:
            return None
