#!/bin/sh
curl -XPOST 'http://localhost:9200/dyson/project_detail' -d '{
    "project_name" : "atom",
    "packages" : ["python", "python-pip"]
}'

#curl -XPUT 'http://localhost:9200/dyson/project/1' -d '{
#    "projects" : ["yamato", "atom", "diamon"]
#}'
