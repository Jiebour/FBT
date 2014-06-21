#-*- coding:utf-8 -*-
import json

def log(msg):
	print msg

'''
types:0 for error, 1 for fine
'''
def write(obj, types, error, result):
	msg = {}
	msg["type"] = types
	msg["error"] = error
	msg["result"] = result
	msg = json.dumps(msg)
	obj.write(msg)

'''
0 for param error, 1 for db error
'''
def errorHandle(obj, num):
	if num == 0:
		write(obj, 0, "400 参数错误", {})
	elif num == 1:
		write(obj, 0, "很抱歉，没有找到合适的", {})