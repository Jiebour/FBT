from datetime import datetime
from pymongo import MongoClient

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

define("port", default=8888, help="run on the given port", type=int)
db = motor.MotorClient().open_sync().fbt

class BaseHandler(tornado.web.RequestHandler):
    def get_current_user(self):
        user_json = self.get_secure_cookie("fbt_user")
        if not user_json: return None
        return user_json

class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r"/", MainHandler),
            (r"/registration", RegistrationHandler),
	        (r"/login", LoginHandler),
	        (r"/logout", LogoutHandler),
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


class MainHandler(BaseHandler):
    @tornado.web.authenticated
    @gen.coroutine
    def get(self):
	token = self.xsrf_token
    if self.current_user:
        cursor = yield motor.Op(db.users.find_one,{"user":self.current_user}) 
    if cursor and cursor.has_key("user") and cursor.has_key("pwd") and cursor.has_key("time") and cursor.has_key("nick"):                
	print cursor['user']
            users = {}
            users["user"] = cursor["user"]
            users["pwd"] = cursor["pwd"]
            users["time"] = cursor["time"]
            users["nick"] = cursor["nick"]
            self.render("index.html", users=users)

class LoginHandler(BaseHandler):
    def get(self):
	token = self.xsrf_token
    self.render("login.html")

    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def post(self):
	token = self.xsrf_token
    if self.get_argument("user") and self.get_argument("pwd"):
        db.users.find_one({"user":self.get_argument("user"),"pwd":self.get_argument("pwd")},
            callback=(yield gen.Callback("key")))
        user = yield gen.Wait("key")
        if user[0][0]:
            print user[0][0]["user"]
            self.set_secure_cookie("fbt_user",self.get_argument("user"))
            if self.get_argument("next"):
                self.redirect(self.get_argument("next"))
            else:
                self.write("1")
            #self.write("ok")
            return
        else:
            self.write("0")
    else:
        self.write("0")
    self.finish()

class LogoutHandler(BaseHandler):
    def get(self):
	token = self.xsrf_token
    self.clear_cookie("fbt_user")
    self.write("You are now logged out")

class RegistrationHandler(BaseHandler):
    def get(self):
	token = self.xsrf_token
    self.render("registration.html")

    @tornado.web.asynchronous
    @tornado.gen.coroutine
    def post(self):
	token = self.xsrf_token
    if self.get_argument("user") and self.get_argument("pwd"):
        db.users.find_one({"user":self.get_argument("user")},
            callback=(yield gen.Callback("key")))
        user = yield gen.Wait("key")
        if user[0][0]:
            self.write("2")
        else:            
            nick = ""
            time = datetime.utcnow()
            if self.get_argument("nick"):
                nick = self.get_argument("nick")
            else:
                nick = "fbt_"+str(uuid.uuid1())[0:10]                               
            new_user = {
                "user" : self.get_argument("user"),
                "pwd" : self.get_argument("pwd"),
                "nick" : nick,
                "time" : time,
            }
            result = yield motor.Op(db.users.insert, new_user)
            if self.get_argument("next"):
                self.redirect(self.get_argument("next"))
            else:
                self.write("1")
    else:
        self.write("0")
    self.finish()

def db_error_handle(user,error):
    print "error"
    print user,error
    pass

def main():
    #db.users.remove()
    tornado.options.parse_command_line()
    http_server = tornado.httpserver.HTTPServer(Application())
    http_server.listen(options.port)
    tornado.ioloop.IOLoop.instance().start()


if __name__ == "__main__":
    main()
    
