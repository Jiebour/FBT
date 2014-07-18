#!/usr/bin/env python

import logging
import tornado.escape
import tornado.ioloop
import tornado.options
import tornado.web
import tornado.websocket
import os.path

import json
# import uuid

import ipaddress as IP
from user_ip_cache import UserIPCache
from resources_cache import ResourcesCache
from http_server_info_cache import HttpServerInfoCache
from download_medium import DownloadMedium

from tornado.options import define, options

define("port", default=8888, help="run on the given port", type=int)


class Application(tornado.web.Application):
    def __init__(self):
        handlers = [
            (r"/", HomeHandler),
            (r"/home", HomeHandler),
            (r"/login", LoginHandler),
            (r"/logout", LogoutHandler),

            (r"/upload_resource", ResourceUploaHandler),
            (r"/view_resource", ResourceViewHandler),
            (r"/download_resource", ResourceDownloadHandler),
            (r"/download_over", ResourceDownloadOverHandler),
            (r"/search_resource", ResourceSearchHandler),

            (r"/request_ip", GetPublicIPHandler),
            (r"/report_http_server_info", HttpServerInfoHandler),

            (r"/websocket", FbtWebSocketHandler),

            (r"/debug/users", UsersListHandler),
            (r"/debug/http_server_info", ViewHttpServerInfoHandler),
            (r"/debug/view_my_resource", MyResourceViewHandler),
            (r"/debug/view_resource", ResourceViewDebugHandler),
        ]
        settings = dict(
            cookie_secret="123",
            # "__TODO:_GENERATE_YOUR_OWN_RANDOM_VALUE_HERE__",
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(os.path.dirname(__file__), "static"),
            xsrf_cookies=True,
        )
        tornado.web.Application.__init__(self, handlers, **settings)


class HomeHandler(tornado.web.RequestHandler):
    def get(self):
        # set cookie just for mock
        # self.set_secure_cookie("fbt_user", self.request.remote_ip)
        self.render("home.html")


class GetPublicIPHandler(tornado.web.RequestHandler):
    def get(self):
        self.write(json.dumps({"err": 0, "ip": self.request.remote_ip}))


# ---------------------------------------------------------
# just a mock of login and logout
# !!!pass me!!! if you are merge the code
class LoginHandler(tornado.web.RequestHandler):
    def get(self):
        user = self.get_argument("user", None)
        if user:
            self.set_secure_cookie("fbt_user", user)
            # set cookie just for mock

            #!!! record the user IP
            #!!!-----------------------------------
            #UserIPCache.update_my_ip(user,self.request.remote_ip)

            #return the page to open websockeGt
            self.render("open_websocket.html", fbt_user=user)
            #-----------------------------------!!!

            #self.write(json.dumps({"err":0}))
        else:
            self.write(json.dumps({"err": 1, "what": "no user argument"}))


class LogoutHandler(tornado.web.RequestHandler):
    def get(self):
        #!!!-----------------------------------
        #user=get_current_user(self)
        #UserIPCache.delete_my_ip(user)
        #-----------------------------------!!!

        self.clear_cookie("fbt_user")
        self.write("You are now logged out")


#---------------------------------------------------------


def get_current_user(handler):
    user_json = handler.get_secure_cookie("fbt_user")
    if not user_json:
        return None
    else:
        return user_json


#class OpenSocketHandler(tornado.web.RequestHandler):
#    # socket open and client http server are in the page
#    def get(self):
#        self.render("open_websocket.html")


class ResourceType(object):
    '''
    enum type
    '''

    class MainType:
        MOVIE = 0
        SOFTWARE = 1
        TV = 3
        #add more type here

    class SubType:
        LOW_QUALITY = 0
        MID_QUALITY = 1
        HIGH_QUALITY = 2


class ResourceUploaHandler(tornado.web.RequestHandler):
    def get(self):
        #user is uid
        user = get_current_user(self)
        if not user:
            user = self.get_argument("user", None)  # mock user since node client has no cookie
        if user:
            try:
                uid = int(user)
            except ValueError:
                err = json.dumps({"err": 4, "what": "uid invalid"})
                self.write(err)
                return
            #TODO
            user_name = "TODO FIXME"  # get the real user name from DB

            file_name = self.get_argument("file_name", None)
            file_hash = self.get_argument("file_hash", None)
            tags = self.get_argument("tags", None)
            try:
                main_type = int(self.get_argument("main_type", 0))
                sub_type = int(self.get_argument("sub_type", 0))
                res_grade = float(self.get_argument("res_grade", 1))
                file_size = int(self.get_argument("file_size", None))
            except ValueError:
                err = json.dumps({"err": 3, "what": "main_type sub_type or res_grade invalid"})
                self.write(err)
                return
            comment = self.get_argument("comment", None)
            try:
                is_public = int(self.get_argument("is_public", 1))  #default is public
            except ValueError:
                err = json.dumps({"err": 5, "what": "is_public invalid"})
                self.write(err)
                return
            if file_name and file_hash and file_size and tags and \
                    res_grade and comment:
                tags_list = tags.split(" ")
                if (len(tags_list) > 0):
                    ResourcesCache.user_upload_resource(uid, user_name,
                                                        file_hash,
                                                        file_name, file_size,
                                                        is_public,
                                                        tags_list,
                                                        main_type, sub_type,
                                                        res_grade,
                                                        comment)
                    ok = json.dumps({"err": 0})
                    self.write(ok)
                else:
                    err = json.dumps({"err": 2, "what": "tags or blocks hash invalid"})
                    self.write(err)
            else:
                err = json.dumps({"err": 1, "what": "argument missing error"})
                self.write(err)



class ResourceDownloadHandler(tornado.web.RequestHandler):
    def get(self):
        #user is uid
        user = get_current_user(self)
        if not user:
            user = self.get_argument("user", None)  # mock user since node client has no cookie
        try:
            uid = int(user)
        except:
            err = json.dumps({"err": 4, "what": "uid invalid"})
            self.write(err)
            return
        file_hash = self.get_argument("file_hash", None)  #default is public
        if not file_hash:
            err = json.dumps({"err": 5, "what": "file hash err"})
            self.write(err)
            return
        res_header = ResourcesCache.get_resource_header(file_hash)
        online_owners=DownloadMedium.get_online_file_owner(uid,file_hash)
        ok = json.dumps({"err": 0, "file_info": res_header, "owners": online_owners})
        self.write(ok)

class ResourceDownloadOverHandler(tornado.web.RequestHandler):
    def get(self):
        #user is uid
        user = get_current_user(self)
        if not user:
            user = self.get_argument("user", None)  # mock user since node client has no cookie
        try:
            uid = int(user)
        except:
            err = json.dumps({"err": 4, "what": "uid invalid"})
            self.write(err)
            return
        file_hash = self.get_argument("file_hash", None)  #default is public
        if not file_hash:
            err = json.dumps({"err": 5, "what": "file hash err"})
            self.write(err)
            return
        ResourcesCache.add_owner(file_hash,uid)
        ResourcesCache.increase_download_num(file_hash)
        ok = json.dumps({"err": 0})
        self.write(ok)

class ResourceViewHandler(tornado.web.RequestHandler):
    def get(self):
        resource_list = ResourcesCache.get_resources_overview()
        for file_hash in resource_list:
            resource_list[file_hash]["online_owners_num"]=DownloadMedium.get_online_user_cnt(file_hash)
        resource_data = json.dumps({"err": 0, "resource_list": resource_list})
        self.write(resource_data)

class SetEncoder(json.JSONEncoder):
        def default(self, obj):
            if isinstance(obj, set):
                return list(obj)
            #if isinstance(obj, Something):
            #   return 'CustomSomethingRepresentation'
            return json.JSONEncoder.default(self, obj)

class MyResourceViewHandler(tornado.web.RequestHandler):
    def get(self):
        #user is uid
        user = get_current_user(self)
        if not user:
            user = self.get_argument("user", None)  # mock user since node client has no cookie
        try:
            uid = int(user)
        except:
            err = json.dumps({"err": 4, "what": "uid invalid"})
            self.write(err)
            return
        resource_list = ResourcesCache.get_my_resource(uid)
        resource_data = json.dumps({"err": 0, "resource_list": resource_list}, cls=SetEncoder)
        self.write(resource_data)

class ResourceViewDebugHandler(tornado.web.RequestHandler):
    def get(self):
        resource_list = ResourcesCache.get_resources_list()
        resource_data = json.dumps({"err": 0, "resource_list": resource_list}, cls=SetEncoder)
        self.write(resource_data)


class HttpServerInfoHandler(tornado.web.RequestHandler):
    def get(self):
        user = get_current_user(self)
        if not user:
            user = self.get_argument("user", None)  # mock user since node client has no cookie
        if user:
            try:
                user=int(user)
            except ValueError:
                err = json.dumps({"err": 5, "what": "invalid uid"})
                self.write(err)
                return
            ip = self.get_argument("ip", None)
            port = self.get_argument("port", None)
            if ip and port:
                if port == '8884' and IP.is_valid_ipv4_address(ip):
                    HttpServerInfoCache.update_ipv4_address(user, ip)
                    ok = json.dumps({"err": 0})
                    self.write(ok)
                elif port == '8886' and IP.is_valid_ipv6_address(ip):
                    HttpServerInfoCache.update_ipv6_address(user, ip)
                    ok = json.dumps({"err": 0})
                    self.write(ok)
                else:
                    err = json.dumps({"err": 2, "what": "port number err or ip address format err. ip:"+ip+" port:"+port})
                    self.write(err)
            else:
                err = json.dumps({"err": 3, "what": "no ip or port"})
                self.write(err)
        else:
            err = json.dumps({"err": 1, "what": "login first"})
            self.write(err)


class ResourceSearchHandler(tornado.web.RequestHandler):
    # TODO
    def get(self):
        self.render("TODO.html")


class UsersListHandler(tornado.web.RequestHandler):
    def get(self):
        user_ip_list = UserIPCache.get_user_ip_list()
        if self.request.remote_ip in user_ip_list.values():
            self.render("user_ip_list.html", title="user ip list", items=user_ip_list)
        else:
            self.write("login with websocket first")


class ViewHttpServerInfoHandler(tornado.web.RequestHandler):
    '''
    this will see how many user are online.
    '''

    def get(self):
        http_server_info = HttpServerInfoCache.get_server_info()
        self.render("http_server_info.html", server_info=http_server_info)


#-------------------------------------------------------------------------------
# when user login, open web socket to interact with server.
# what if the same ip behind different LAN network???
#-------------------------------------------------------------------------------
class FbtWebSocketHandler(tornado.websocket.WebSocketHandler):
    '''
    Just used for user online detection. I keep it as simple as possible.
    '''
    waiters = dict()  #all online users are here

    def open(self):
        logging.info("websocket address:" + self.request.remote_ip)

    def on_close(self):
        user_to_del = None
        for user, connection in FbtWebSocketHandler.waiters.iteritems():
            if connection == self:
                user_to_del = user
                logging.info("detect websocket close:" + str(user_to_del))
                break
        if user_to_del:
            del FbtWebSocketHandler.waiters[user_to_del]
            UserIPCache.delete_my_ip(user_to_del)
            #FbtWebSocketHandler.user_ips.remove(self.request.remote_ip)

    def on_message(self, message):
        logging.info("got message %r", message)
        json_data = json.loads(message)
        if "uid" in json_data:
            user = json_data["uid"]
            logging.info("got message from uid:%r", user)
            try:
                user=int(user)
                UserIPCache.update_my_ip(user, self.request.remote_ip)  #!!! record the user IP
                FbtWebSocketHandler.waiters[user] = self
                self.write_message(json.dumps({"err": 0}))
            except ValueError:
                self.write_message(json.dumps({"err": 2, "what": "uid is not number"}))
        else:
            self.write_message(json.dumps({"err": 1, "what": "json format error"}))

#-------------------------------------------------------------------------------

def main():
    tornado.options.parse_command_line()
    app = Application()
    app.listen(options.port)
    tornado.ioloop.IOLoop.instance().start()


if __name__ == "__main__":
    main()
