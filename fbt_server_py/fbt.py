#-*- coding:utf-8 -*-
from datetime import datetime
import tornado.httpserver
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.escape
import os.path
from tornado import gen
import motor
import uuid
from tornado.options import define, options
import tornado.websocket
import json
import msg_handle
import util

define("port", default=8888, help="run on the given port", type=int)
db = motor.MotorClient().fbt#motor.MotorClient().open_sync().fbt

class BaseHandler(tornado.web.RequestHandler):
    def get_current_user(self):
        user_json = self.get_secure_cookie("fbt_user")
        if not user_json: return None
        return user_json

class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r"/", MainHandler),
            (r"/index", MainHandler),
            (r"/registration", RegistrationHandler),
	        (r"/login", LoginHandler),
	        (r"/logout", LogoutHandler),
            (r'/socket', SocketHandler),
            (r'/mySpace', MySpaceHandler),
            (r'/myInfo', MyInfoHandler),
            (r'/myFriend', MyFriendHandler),
            (r'/myShuo', MyShuoHandler),
            (r'/test', TestHandler),
        ]

        settings = dict(
	        template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            xsrf_cookies=True,
            cookie_secret="p9/fgwB0R5+qV/rs6ICKe0pOdOhkckpEv2Zc/E1ZeYk=",
            login_url="/login",
            debug=True,
            autoescape=None,
        )
        tornado.web.Application.__init__(self, handlers, **settings)

'''
msg format
{"user":user_name, "msg_list":[{"isRead":True/False, "sender":user_name, "type":0 for sys/1 for add, "content":msg_content may be ""},...]}
'''
class MainHandler(BaseHandler):
    @tornado.web.authenticated
    @tornado.web.asynchronous
    @gen.coroutine
    def get(self):
    	token = self.xsrf_token
        remote_ip = self.request.remote_ip;
        cursor = yield motor.Op(db.users.find_one,{"user":self.current_user}) 
        util.log("MainHandler.get")
        util.log( cursor)
        msg = yield db.user_msg.find_one({'user': self.current_user})
        util.log(msg)
        if msg:
            msg = msg["msg_list"]
            count = 0
            for item in msg:
                if not item["isRead"]:
                    count += 1            
            self.render("index.html", msg=msg, count=count)
        else:
            self.render("index.html", msg=[], count=0)

class LoginHandler(BaseHandler):
    def get(self):
    	token = self.xsrf_token
        if self.current_user:
            self.redirect("/")
        self.render("login.html")

    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def post(self):
    	token = self.xsrf_token
        if self.get_argument("user") and self.get_argument("pwd"):
            db.users.find_one({"user":self.get_argument("user"), "password":self.get_argument("pwd")},
                callback=(yield gen.Callback("key")))
            user = yield gen.Wait("key")
            #find = False
            if user[0]:
                util.log("LoginHandler.post")
                util.log( user[0])
                if user[0][0] and user[0][0]["user"]:
                    #find = True
                    self.set_secure_cookie("fbt_user",self.get_argument("user"))
                    if self.get_argument("remember") and self.get_argument("remember") == "1":
                        self.set_cookie("fbt_u",self.get_argument("user"))
                        self.set_cookie("fbt_pwd",self.get_argument("pwd"))
                    if self.get_argument("next"):
                        self.redirect(self.get_argument("next"))
                    else:
                        result = {}
                        result["result"] = self.get_argument("user")
                        util.write(self, 1, "", result)
                        self.finish()
                    #self.write("ok")
                    return                           
                else:
                    util.write(self, 0, "用户名不存在或者用户名与密码不匹配", {})
                    self.finish()
            else:
                util.write(self, 0, "用户名不存在或者用户名与密码不匹配", {})
                self.finish()
        else:
            util.errorHandle(self, 0)
            self.finish()

class LogoutHandler(BaseHandler):
    @tornado.web.authenticated
    def get(self):
    	token = self.xsrf_token
        #when logout, close the socket
        if SocketHandler.client_user.has_key(self.current_user):
            util.log("sock close")
            cursor = yield motor.Op(db.users.find_one,{"user":self.current_user}) 
            util.log("LogoutHandler.get")
            util.log( cursor)
            tell = {"type":1, "msg":self.current_user+" left"}
            #use send_to_all to test
            SocketHandler.send_to_all(SocketHandler.client_user[self.current_user], json.dumps(tell))
            #SocketHandler.send_to_friends(cursor["friends"], json.dumps(tell))
            sock = SocketHandler.client_user[self.current_user]
            del(SocketHandler.client_socket[sock])
            del(SocketHandler.client_user[self.current_user])
            sock.close()
        self.clear_cookie("fbt_user")
        util.write(self, 1, "", {})
        self.finish()

class RegistrationHandler(BaseHandler):
    def get(self):
    	token = self.xsrf_token
        self.render("registration.html")

    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def post(self):
    	token = self.xsrf_token
        if self.get_argument("user") and self.get_argument("pwd"):
            util.log("RegistrationHandler.post")
            util.log( self.get_argument("user"))
            db.users.find_one({"user":self.get_argument("user")},
                callback=(yield gen.Callback("key")))
            user = yield gen.Wait("key")
            if user[0][0]:
                util.write(self, 0, "用户名已经存在，请选用其他用户名", {})
                self.finish()
            else:            
                nick = ""
                time = datetime.utcnow()
                if self.get_argument("nick"):
                    nick = self.get_argument("nick")
                else:
                    nick = "fbt_"+str(uuid.uuid1())[0:10]                        
                icon = self.static_url('images/user_icon/fbtLogo.png')       
                new_user = {'user':self.get_argument("user"),'time':time, 'icon':icon,'desc':'点击编辑',
                'real_name':'', 'phone':'', 'qq':'',
                    'gender':'', 'love_state':'', 'school':'', 'address':'',
                    'password':self.get_argument("pwd"), 'nick_name':nick, 'friends':[]
                }
                result = yield db.users.insert(new_user)
                #msg_handle.initMsg(self.get_argument("user"))
                if self.get_argument("next"):
                    self.redirect(self.get_argument("next"))
                else:
                    util.write(self, 1, "", {})
                    self.finish()
        else:
            util.errorHandle(self, 0)
            self.finish()

'''
param:op=[0=search,1=add,2=confirmAdd,3=delete,4 for star,5 for unstar],[search=search | user = user]
'''
class MyFriendHandler(BaseHandler):
    @tornado.web.authenticated
    def post(self):
        if self.get_argument("op"):
            op = self.get_argument("op")
            if op[0] >= '0' and op[0] <= '9':
                op = int(op)
                util.log("MyFriendHandler.post")
                util.log( op)
                if op == 0:
                    self.search()
                elif op == 1:
                    self.add()
                elif op == 2:
                    self.confirmAdd()
                elif op == 3:
                    self.delete()
                elif op == 4:
                    self.star()
                elif op == 5:
                    self.unStar()
            else:
                util.errorHandle(self, 0)
                self.finish()
        else:
            util.errorHandle(self, 0)
            self.finish()

    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def search(self):
        if self.get_argument("search"):
            search = self.get_argument("search")
            data = []
            cursor = db.users.find({"$or":
                [
                {"user":search},
                {"nick_name":search}
            ]})
            while (yield cursor.fetch_next):
                user = cursor.next_object()
                if user["user"] == self.current_user:
                    continue
                result = {}
                result["icon"] = user["icon"]
                result["nick_name"] = user["nick_name"]
                result["user"] = user["user"]
                data.append(result)                            
            # db.users.find({"$or":
            #     [
            #     {"user":search},
            #     {"nick_name":search}
            # ]},callback=(yield gen.Callback("key")))
            # user = yield gen.Wait("key")
            util.write(self, 1, "", json.dumps(data))
            self.finish()
        else:
            util.errorHandle(self, 0)
            self.finish()
    
    '''
    msg format
    {"user":user_name, "msg_list":[{"isRead":True/False, "sender":user_name, "type":0 for sys/1 for add, "content":msg_content may be ""},...]}
    '''
    @tornado.web.asynchronous
    @tornado.gen.coroutine    
    def add(self):
        if self.get_argument("user"):
            user = self.get_argument("user")
            msg = {}
            msg["isRead"] = 0
            msg["id"] = str(uuid.uuid1())
            msg["sender"] = self.current_user
            msg["type"] = 1
            msg["content"] = self.current_user+"想加你为好友，是否同意？"
            msg["time"] = str(datetime.utcnow())
            if SocketHandler.client_user.has_key(user):
                SocketHandler.send_to_one(user, json.dumps(msg))
            yield motor.Op(msg_handle.addMsg, user, msg, self, "添加好友请求已发送，请等待对方确认", "添加好友请求失败，请重试")
            util.log( "MyFriend.add")
        else:
            util.errorHandle(self, 0)
            self.finish()
            

    @tornado.web.asynchronous
    @tornado.gen.coroutine 
    def delete(self):
        if self.get_argument("user") and self.get_argument("star"):
            user = self.get_argument("user")
            star = self.get_argument("star")
            if star[0] >= '0' and star[0] <= '9':
                u1 = {"user":self.current_user, "isStar":0}
                u2 = {"user":self.current_user, "isStar":1}
                yield db.users.update({'user': user}, {'$pull':{"friends":u1}})
                yield db.users.update({'user': user}, {'$pull':{"friends":u2}})
                u = {"user":user, "isStar": int(star)}
                result = yield db.users.update({'user': self.current_user}, {'$pull':{"friends":u}})
                util.log( "MyFriend.delete" + str(result))
                if result.has_key("nModified") and result["nModified"] == 1:
                    if not result.has_key("writeConcernError"):
                        result = {"result" : "删除好友成功"}
                        util.write(self, 1, "", result)
                        self.finish()
                    else:
                        util.log( result["writeConcernError"])
                        util.write(self, 0, "删除好友请求失败，请重试", {})
                        self.finish()
                else:
                    #util.log( result["writeError"])
                    util.write(self, 0, "删除好友请求失败，请重试", {})
                    self.finish()
            else:
                util.errorHandle(self, 0)
                self.finish()
        else:
            util.errorHandle(self, 0)
            self.finish()

    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def confirmAdd(self):
        if self.get_argument("user") and self.get_argument("id"):
            user = self.get_argument("user")
            re = {"user":self.current_user, "isStar":0}
            result = yield db.users.update({'user': user}, {'$push':{"friends":re}})
            re = {"user":user, "isStar":0}
            result = yield db.users.update({'user': self.current_user}, {'$push':{"friends":re}})
            yield motor.Op(msg_handle.ReadMsg, self.current_user, self.get_argument("id"))
            util.log( "MyFriend.confirmAdd" + str(result))
            if result.has_key("nModified") and result["nModified"] == 1:
                if not result.has_key("writeConcernError"):
                    result = {"result" : "添加好友成功"}
                    util.write(self, 1, "", result)
                    self.finish()
                else:
                    util.log( result["writeConcernError"])
                    util.write(self, 0, "添加好友请求失败，请重试", {})
                    self.finish()
            else:
                #util.log( result["writeError"])
                util.write(self, 0, "添加好友请求失败，请重试", {})
                self.finish()
        else:
            util.errorHandle(self, 0)
            self.finish()

    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def star(self):
        if self.get_argument("user"):
            user = self.get_argument("user")
            result = yield db.users.update({'user':self.current_user, "friends.user":user}, {'$set':{"friends.$.isStar":1}})
            util.log( "MyFriend.star" + str(result))
            if result.has_key("nModified") and result["nModified"] == 1:
                if not result.has_key("writeConcernError"):
                    result = {"result" : "关注好友成功"}
                    util.write(self, 1, "", result)
                    self.finish()
                else:
                    util.log( result["writeConcernError"])
                    util.write(self, 0, "关注好友请求失败，请重试", {})
                    self.finish()
            else:
                #util.log( result["writeError"])
                util.write(self, 0, "关注好友请求失败，请重试", {})
                self.finish()
        else:
            util.errorHandle(self, 0)
            self.finish()

    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def unStar(self):
        if self.get_argument("user"):
            user = self.get_argument("user")
            result = yield db.users.update({'user':self.current_user, "friends.user":user}, {'$set':{"friends.$.isStar":0}})
            util.log( "MyFriend.unStar" + str(result))
            if result.has_key("nModified") and result["nModified"] == 1:
                if not result.has_key("writeConcernError"):
                    result = {"result" : "取消关注好友成功"}
                    util.write(self, 1, "", result)
                    self.finish()
                else:
                    util.log( result["writeConcernError"])
                    util.write(self, 0, "取消关注好友请求失败，请重试", {})
                    self.finish()
            else:
                #util.log( result["writeError"])
                util.write(self, 0, "取消关注好友请求失败，请重试", {})
                self.finish()
        else:
            util.errorHandle(self, 0)
            self.finish()

'''
op: 0 for add, 1 for get, 2 for del
param:
'''
class MyShuoHandler(BaseHandler):
    @tornado.web.authenticated
    def post(self):
        if self.get_argument("op"):
            op = self.get_argument("op")
            if op[0] >= '0' and op[0] <= '9':
                op = int(op)
                util.log("MyShuoHandler.post")
                util.log( op)
                if op == 0:
                    self.add()
                elif op == 1:
                    self.g()
                elif op == 2:
                    self.delete()
            else:
                util.errorHandle(self, 0)
                self.finish()
        else:
            util.errorHandle(self, 0)
            self.finish()

    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def add(self):
        if self.get_argument("param"):
            param = self.get_argument("param")
            yield motor.Op(msg_handle.addShuo, self.current_user, param, self, "添加成功", "添加失败，请重试")
            util.log( "MyShuoHandler.add")
        else:
            util.errorHandle(self, 0)
            self.finish()

    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def g(self):
        result = yield db.user_shuo.find_one({'user': self.current_user})
        util.log( "MyShuoHandler.get" + str(result))
        if result:
            util.write(self, 1, "", result)
        else:
            util.errorHandle(self, 1)

    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def delete(self):
        if self.get_argument("param"):
            param = self.get_argument("param")
            yield motor.Op(msg_handle.delShuo, self.current_user, param, self, "删除成功", "删除失败，请重试")
            util.log( "MyShuoHandler.delete")
        else:
            util.errorHandle(self, 0)
            self.finish()

class MySpaceHandler(BaseHandler):
    @tornado.web.authenticated
    @gen.coroutine
    @tornado.web.asynchronous
    def get(self):
        token = self.xsrf_token
        if self.current_user:
            cursor = yield motor.Op(db.users.find_one,{"user":self.current_user}) 
            util.log("MySpaceHandler.get")
            util.log(cursor)
            friends = cursor["friends"]
            onlineFriends = getOnlineFriend(friends)
            re = "说啥呢"
            shuo = yield motor.Op(msg_handle.getAllShuo, self.current_user)
            util.log(shuo)
            if shuo:
                tmp = shuo["msg_list"]
                re = tmp[len(tmp)-1]
            self.render("mySpace.html", user=cursor, friends=friends, onlineFriends= onlineFriends,shuo=re, 
                count=len(friends), count_online=len(onlineFriends))

class MyInfoHandler(BaseHandler):
    keys = ["real_name","phone","qq","gender","love_state","school","address","nick_name","password"]
    @tornado.web.authenticated
    @tornado.web.asynchronous
    @gen.coroutine
    def get(self):
        token = self.xsrf_token
        user = yield motor.Op(db.users.find_one,{"user":self.current_user})
        if not user:
            self.render("myInfo.html",user={}, shuo="说啥呢")
        else:
            re = "说啥呢"
            shuo = yield motor.Op(msg_handle.getAllShuo, self.current_user)
            util.log(shuo)
            if shuo:
                tmp = shuo["msg_list"]
                re = tmp[len(tmp)-1]
            self.render("myInfo.html",user=user, shuo=re)
    
    @tornado.web.authenticated
    @gen.coroutine
    @tornado.web.asynchronous
    def post(self):
        if self.get_argument("user"):
            user = self.get_argument("user")
            if user:
                user = json.loads(user)
                util.log("MyInfoHandler.post")
                util.log( user)
                isError = False
                for item in user.keys():
                    if item not in  MyInfoHandler.keys:
                        isError = True
                        break
                if not isError:
                    if user.has_key("icon"):
                        user["icon"] = self.static_url(user["icon"])
                    future = db.users.update({'user': self.current_user},{'$set': user})
                    result = yield future
                    util.log( result)
                    if result:
                        re = {"result":"保存成功"}
                        util.write(self, 1, "", re)
                        self.finish()
                    else:
                        util.write(self, 0, "保存失败，请重试", {})
                        self.finish()
                else:
                    util.write(self, 0, "保存失败，请重试", {})
                    self.finish()
            else:
                util.write(self, 0, "保存失败，请重试", {})
                self.finish()
        else:
            util.errorHandle(self, 0)
            self.finish()

class SocketHandler(tornado.websocket.WebSocketHandler):
    client_socket = {}
    client_user = {}

    @staticmethod
    def send_to_all(s, message):
        for c in SocketHandler.client_socket.keys():
            if c == s:
                continue
            c.write_message(message)

    @staticmethod
    def send_to_one(user, msg):
        SocketHandler.client_user[user].write_message(msg)

    @staticmethod
    def send_to_friends(users, msg):
        for item in users:
            if SocketHandler.client_user.has_key(item):
                SocketHandler.client_user[item].write_message(msg)

    def open(self):
        util.log( "SocketHandler Welcome ")
        #SocketHandler.send_to_all(str(id(self)) + ' has joined')
        #SocketHandler.clients.add(self)

    #type is the first letter of message and 0 for join, 1 for left, 2 for heart, 3 for chat
    def on_message(self, message):
        util.log( "SocketHandler msg "+ message)
        types = int(message[0])
        if types == 0:
            name = message[1:]
            SocketHandler.client_user[name] = self
            SocketHandler.client_socket[self] = name
            tell = {"type":0, "msg":name+" join"}
            #use send_to_all to test
            SocketHandler.send_to_all(self, json.dumps(tell))
            #SocketHandler.send_to_friends(cursor["friends"], json.dumps(tell))       

    @gen.coroutine
    def on_close(self):
        util.log( "SocketHandler close ")
        if SocketHandler.client_socket.has_key(self):
            name = SocketHandler.client_socket[self]
            cursor = yield motor.Op(db.users.find_one,{"user":name}) 
            util.log("SocketHandler.on_close")
            util.log( cursor)
            tell = {"type":1, "msg":name+" left"}
            #use send_to_all to test
            SocketHandler.send_to_all(self, json.dumps(tell))
            #SocketHandler.send_to_friends(cursor["friends"], json.dumps(tell))
            del(SocketHandler.client_socket[self])
            del(SocketHandler.client_user[name])
        #SocketHandler.send_to_all(name + ' has left')

def getOnlineFriend(users):
    re = []
    for item in users:
        if SocketHandler.client_user.has_key(item["user"]):
            re.append(item)
    return re

def db_error_handle(user,error):
    util.log( "error")
    pass

class TestHandler(BaseHandler):
    def get(self):
        # token = self.xsrf_token
        # msg = json.loads(self.get_argument("test"))
        # util.log( msg["test"])
        pass
    def post(self):
        # token = self.xsrf_token
        # msg = json.loads(self.get_argument("test"))
        # util.log( msg["test"])
        pass

def main():
    #db.users.remove()
    tornado.options.parse_command_line()
    http_server = tornado.httpserver.HTTPServer(Application(), xheaders=True)
    http_server.listen(options.port)
    tornado.ioloop.IOLoop.instance().start()


if __name__ == "__main__":
    main()
    
