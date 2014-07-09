#-*- coding:utf-8 -*-
from tornado import gen
import motor
import tornado.web
import util
import uuid

db_msg = motor.MotorClient().fbt#motor.MotorClient().open_sync().fbt
'''
msg format
{"user":user_name, "msg_list":[{"isRead":True/False, "sender":user_name, "type":0 for sys/1 for add, "content":msg_content may be ""},...]}
'''

# @gen.coroutine
# def initMsg(user):
# 	new_msg = {"user":user, "msg_list":[]}
# 	result = yield db_msg.user_msg.insert(new_msg)
# 	print "initMsg" + str(result)
'''
all handle about user msg
'''
@gen.coroutine
def addMsg(user, content, s, suc, fail):
    result = yield db_msg.user_msg.update({'user': user}, {'$addToSet':{"msg_list":content}}, True)
    util.log( "addMsg" + user )
    if result.has_key("nModified") and result["nModified"] == 1:
        if not result.has_key("writeConcernError"):
            result = {"result" : suc}
            util.write(s, 1, "", result)
            s.finish()
        else:
            util.log( result["writeConcernError"])
            util.write(s, 0, fail, {})
            s.finish()
    else:
        #util.log( result["writeError"])
        util.write(s, 0, fail, {})
        s.finish()

#deprecated
@gen.coroutine
def getAllMsg(user):
    result = yield db_msg.user_msg.find_one({'user': '2@qq.com'})
    util.log(result)
    util.log( "getAllMsg" + user)

@gen.coroutine
def delMsg(user):
	yield db_msg.user_msg.remove({"user":user})
	util.log( "delMsg" + user)

@gen.coroutine
def ReadMsg(user, i):
	yield db_msg.user_msg.update({"user":user, "msg_list.id":i}, {"$set":{"msg_list.$.isRead":True}})
	util.log( "delMsg" + user)
'''
all handle about user's shuoshuo and others' comment
'''
@gen.coroutine
def addShuo(user, content, s, suc, fail):
    re = {}
    re["id"] = str(uuid.uuid1())
    re["content"] = content
    re["comment"] = []
    result = yield db_msg.user_shuo.update({'user': user}, {'$push':{"shuo_list":re}}, True)
    util.log( "addShuo" + user )
    if result.has_key("nModified") and result["nModified"] == 1:
        if not result.has_key("writeConcernError"):
            result = {"result" : suc}
            util.write(self, 1, "", result)
            self.finish()
        else:
            util.log( result["writeConcernError"])
            util.write(self, 0, fail, {})
            self.finish()
    else:
        #util.log( result["writeError"])
        util.write(s, 0, fail, {})
        s.finish()

@gen.coroutine
def delShuo(user, i, s, suc, fail):
    result = yield db_msg.user_shuo.update({"user":user, "msg_list.id":i}, {"$unset":{"msg_list.$":0}})
    yield db_msg.user_shuo.update({},{'$pull':{'msg_list':None}})
    util.log( "delShuo" + user)
    if result.has_key("nModified") and result["nModified"] == 1:
        if not result.has_key("writeConcernError"):
            result = {"result" : suc}
            util.write(self, 1, "", result)
            self.finish()
        else:
            util.log( result["writeConcernError"])
            util.write(self, 0, fail, {})
            self.finish()
    else:
        #util.log( result["writeError"])
        util.write(s, 0, fail, {})
        s.finish()
#deprecated
@gen.coroutine
def getAllShuo(user):
	yield db_msg.user_shuo.find_one({'user': user})

# def getRecentShuo(user):
# 	re = ""
# 	result = yield db_msg.user_shuo.find_one({'user': user})
# 	if result:
# 		tmp = result["msg_list"]
# 		re = tmp[len(tmp)-1]
# 	return re
