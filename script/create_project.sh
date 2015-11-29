#!/bin/sh
#curl -XPOST 'http://localhost:9200/dyson/project_detail' -d '{
#    "project_name" : "yamato",
#    "packages" : ["strongswan", "nginx", "apache2"]
#}'

curl -XPUT 'http://localhost:9200/dyson/project/1' -d '{
    "projects" : ["yamato", "atom", "diamon"]
}'
