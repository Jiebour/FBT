__author__ = 'bone-lee'


from time import time

class ResourcesCache(object):
    '''
    memory resources
    TODO add to DB
    '''
    _all_resources = dict()  #such as
    # {file_hash1: {
    #   file_name: xxx,
    #   main_type: 0~5, #see ResourceType
    #   sub_type: 0~3,
    #   file_size: 1234,
    #   mtime: 2014-3-4,
    #   tags: [tag1,tag2,...]
    #   owners: {uid1: is_public,uid2: is_private,...}
    #   grades: {uid1: grade1, uid2: grade2,...}
    #   comments: [{who: user_name1, uid: uid1, content: the content of comment, ctime: 2014-4-3},...]
    #   download_num: 123
    #   },
    #  file_hash2: ....}
    _resources_of_user = dict()  #such as {uid1:[file_hash1,file_hash2],uid2:[file_hash3,file_hash3]}
    _tags = dict()  #such as {tag1: [file_hash1,file_hash2,...],tag2:....}

    @classmethod
    def get_resources_list(cls):
        return cls._all_resources

    @classmethod
    def get_my_resource(cls,uid):
        my_resource=[]
        if uid in cls._resources_of_user:
            my_resource=list(cls._resources_of_user[uid])
        return my_resource

    @classmethod
    def get_resources_overview(cls):
        ret = dict()
        for k in cls._all_resources:
            ret[k] = dict()
            ret[k]['file_name'] = cls._all_resources[k]['file_name']
            ret[k]['main_type'] = cls._all_resources[k]['main_type']
            ret[k]['sub_type'] = cls._all_resources[k]['sub_type']
            ret[k]['file_size'] = cls._all_resources[k]['file_size']
            ret[k]['mtime'] = cls._all_resources[k]['mtime']
            ret[k]['tags'] = " ".join(tag for tag in cls._all_resources[k]['tags'])
            ret[k]['avg_grade'] = (sum(cls._all_resources[k]['grades'].itervalues()) + 0.0) / (
                len(cls._all_resources[k]['grades']))
            ret[k]['comments'] = cls._all_resources[k]['comments']
            if "download_num" not in cls._all_resources[k]:
                cls._all_resources[k]["download_num"]=0
            ret[k]['download_num'] = cls._all_resources[k]['download_num']
        return ret

    @classmethod
    def get_resource_owners(cls, file_hash):
        #owners: {uid1: is_public,uid2: is_private,...}
        assert len(file_hash) > 0
        owners = []
        if file_hash in cls._all_resources:
            owners = [uid for (uid, is_public) in cls._all_resources[file_hash]['owners'].items() if (is_public)]
        return owners

    @classmethod
    def get_resource_header(cls, file_hash):
        assert len(file_hash) > 0
        header_info = dict()
        if file_hash in cls._all_resources:
            header_info['file_size'] = cls._all_resources[file_hash]['file_size']
            header_info['file_name'] = cls._all_resources[file_hash]['file_name']
            header_info['file_hash'] = file_hash
        return header_info

    @classmethod
    def user_upload_resource(cls, uid,  #unique user id
                             user_name,  #user name registered
                             file_hash,  #file hash
                             #blocks_hash,#file blocks(4KB for each block) hash
                             file_name,  #file name
                             file_size,  #file size
                             is_public,  #is public share
                             tags,  #tags for resources
                             main_type,  #resource main type
                             sub_type,  #resource sub type
                             res_grade,  #resource grade by user
                             comment):  #user's comment
        cls._add_to_my_resource_list(uid, file_hash)
        cls._upinsert_resource_info(file_hash, file_name, main_type, sub_type, file_size)
        cls._add_resource_owner(file_hash, uid, is_public)
        cls._add_resource_grade(file_hash, uid, res_grade)
        cls._add_resource_comment(file_hash, uid, user_name, comment)
        cls._add_tags_for_resource(file_hash, tags)

    @classmethod
    def add_owner(cls,file_hash, uid):
        #ResourcesCache.add_owner(file_hash,uid)
        #ResourcesCache.increase_download_num(file_hash)
        assert (uid >= 0)
        assert (len(file_hash) > 0)
        if file_hash in cls._all_resources:
            cls._all_resources[file_hash]["owners"][uid]=1 #default is public
            cls._add_to_my_resource_list(uid, file_hash)

    @classmethod
    def increase_download_num(cls,file_hash):
        assert (len(file_hash) > 0)
        if file_hash in cls._all_resources:
            if "download_num" not in cls._all_resources[file_hash]:
                cls._all_resources[file_hash]["download_num"]=0
            else:
                cls._all_resources[file_hash]["download_num"]+=1

    @classmethod
    def _add_to_my_resource_list(cls, uid, file_hash):
        assert (uid >= 0)
        assert (len(file_hash) > 0)
        if uid not in cls._resources_of_user:
            cls._resources_of_user[uid] = set()
        cls._resources_of_user[uid].add(file_hash)

    @classmethod
    def _add_resource_owner(cls, file_hash, uid, is_public):
        assert (len(file_hash) > 0)
        assert (uid >= 0)
        assert (is_public == 0 or is_public == 1)
        if file_hash not in cls._all_resources:
            cls._all_resources[file_hash] = dict()
        if "owners" not in cls._all_resources[file_hash]:
            cls._all_resources[file_hash]["owners"] = dict()
        cls._all_resources[file_hash]["owners"][uid] = is_public

    @classmethod
    def _add_resource_comment(cls, file_hash, uid, user_name, comment):
        assert (len(file_hash) > 0)
        assert (uid >= 0)
        assert (len(user_name) > 0)
        assert (len(comment) > 0)
        if file_hash not in cls._all_resources:
            cls._all_resources[file_hash] = dict()
        if "comments" not in cls._all_resources[file_hash]:
            cls._all_resources[file_hash]["comments"] = list()
        #comments: [{who: user_name1, uid: uid1, content: the content of comment, ctime: 2014-4-3},...]
        cls._all_resources[file_hash]["comments"].append(
            {"who": user_name, "uid": uid, "content": comment, "ctime": long(time())})

    @classmethod
    def _add_resource_grade(cls, file_hash, uid, grade):
        #grades: {uid1: grade1, uid2: grade2, ...}
        assert (len(file_hash) > 0)
        assert (uid >= 0)
        assert (grade >= 0)
        if file_hash not in cls._all_resources:
            cls._all_resources[file_hash] = dict()
        if 'grades' not in cls._all_resources[file_hash]:
            cls._all_resources[file_hash]['grades'] = dict()
        cls._all_resources[file_hash]['grades'][uid] = grade

    @classmethod
    def _upinsert_resource_info(cls, file_hash, file_name, main_type, sub_type, file_size):
        assert (len(file_hash) > 0)
        assert (len(file_name) > 0)
        assert (main_type >= 0)
        assert (sub_type >= 0)
        assert (file_size > 0)
        if file_hash not in cls._all_resources:
            cls._all_resources[file_hash] = dict()
        cls._all_resources[file_hash]['file_name'] = file_name  #any user can update this
        cls._all_resources[file_hash]['main_type'] = main_type  #any user can update this
        cls._all_resources[file_hash]['sub_type'] = sub_type  #any user can update this
        cls._all_resources[file_hash]['mtime'] = long(time())  #any user can update this
        if 'file_size' not in cls._all_resources[file_hash]:
            cls._all_resources[file_hash]['file_size'] = file_size

    @classmethod
    def _add_tags_for_resource(cls, file_hash, tags):
        assert (len(file_hash) > 0)
        assert (len(tags) > 0)
        #tags: [tag1,tag2,...]
        #{tag1: [file_hash1,file_hash2,...],tag2:....}
        if file_hash not in cls._all_resources:
            cls._all_resources[file_hash] = dict()
        if 'tags' not in cls._all_resources[file_hash]:
            cls._all_resources[file_hash]['tags'] = set()
        for tag in tags:
            if len(tag) > 0:
                cls._all_resources[file_hash]['tags'].add(tag)
                if tag not in cls._tags:
                    cls._tags[tag] = set()
                cls._tags[tag].add(file_hash)
            else:
                pass  #tag is invalid
