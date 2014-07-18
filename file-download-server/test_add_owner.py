__author__ = 'bone-lee'

from resources_cache import ResourcesCache

def test_add_owner():
    # user 2 uploaded the resource
    ResourcesCache.user_upload_resource(2,"user2","file_hash2","test2.txt",1023,1,"test",0,1,3,"user2 uploaded file")
    ResourcesCache.add_owner('file_hash2',2) #the same user

    assert ResourcesCache.get_resource_owners("file_hash2")==[2]
    ResourcesCache.add_owner('file_hash2',20) #the same user
    assert ResourcesCache.get_resource_owners("file_hash2")==[2,20]

    ResourcesCache.increase_download_num("file_hash2")
    assert ResourcesCache.get_resources_list()["file_hash2"]["download_num"]==0
    ResourcesCache.increase_download_num("file_hash2")
    assert ResourcesCache.get_resources_list()["file_hash2"]["download_num"]==1
#if __name__ == "__main__":
#    test_add_owner()