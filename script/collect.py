#!/usr/bin/env python

#import apt_pkg
#import apt.progress.text
#apt_pkg.init()
#progress = apt.progress.text.OpProgress()
#cache = apt.Cache(progress)
#for pkg in cache.packages:
#    print pkg.name
#    if pkg.installed:
#        print pkg.name + " installed " + pkg.version()
#cache = apt.Cache()
#for pkg in sorted(cache.packages, key=lambda pkg: pkg.name):
#  print pkg

import apt
import pkg_resources
import json
import socket
#import httplib
import requests
import platform
from optparse import OptionParser

def read_apt_pkg():
  pkgs = []
  cache = apt.Cache()
  for pkg in cache:
    if pkg.installed:
      pkgs.append({"package":pkg.name, "version":str(pkg.versions[0].version)})
#      print pkg.name + ":" + str(pkg.versions[0].version)
  return pkgs


def read_python_pkg():
  pkgs = []
  for dist in pkg_resources.working_set:
    #print dist.project_name + ":" + dist.version
    pkgs.append({"package":dist.project_name, "version":dist.version})
  return pkgs

def get_hostname():
  return socket.gethostname()
 
#print read_apt_pkg()
#print read_python_pkg()
#print json.dumps(read_python_pkg())
#print get_hostname()
def compose_report(host="localhost", port=443):
  data = {}
  data['host'] = get_hostname()
  data['platform'] = platform.linux_distribution()
  data['kernel'] = platform.platform()
  data['apt'] = read_apt_pkg()
  data['python'] = read_python_pkg()
  if port != 443:
    uri = "https://" + host + ":" + port + "/dyson/report"
  else:
    uri = "https://" + host + "/dyson/report"
  print json.dumps(data)
  r = requests.post(uri, data=json.dumps(data),headers={"content-type": "application/json"}, verify=False)
  if r.status_code == 200:
    return True
  else:
    return False

parser = OptionParser()
parser.add_option("-H", "--host", dest="host", default="localhost",
                  help="server host")

parser.add_option("-p", "--port", dest="port", default=443,
                  help="server port")
(options, args) = parser.parse_args()

if compose_report(host=options.host, port=options.port):
  print "OK"
else:
  print "CRITICAL"
