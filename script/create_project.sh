#!/bin/sh
curl -XPOST 'http://localhost:9200/dyson/project_detail' -d '{
    "project_name" : "atom",
    "packages" : ["python/apt", "python-pip/apt"]
}'

curl -XPUT 'http://localhost:9200/dyson/project/1' -d '{
    "projects" : ["yamato", "atom"]
}'
