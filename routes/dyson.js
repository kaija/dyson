var express = require('express');
var elasticsearch = require('elasticsearch');
var router = express.Router();

var poolModule = require('generic-pool');
var pool = poolModule.Pool({
  name     : 'elasticsearch',
  create   : function(callback) {
    var client = new elasticsearch.Client({
//      log: 'trace',
      host: 'localhost:9200'
    });
    // parameter order: err, resource
    // new in 1.0.6
    callback(null, client);
  },
  destroy  : function(client) {
    console.log("destroy elasticsearch client");
  },
  max      : 20,
  // optional. if you set this, make sure to drain() (see step 3)
  min      : 20,
  // specifies how long a resource can stay idle in pool before being removed
  // idleTimeoutMillis : 30000,
  // disable idle destroy
  refreshIdle: false,
  // if true, logs via console.log - can also be a function
  //log : true
});

/*
pool.drain(function() {
    pool.destroyAllNow();
});
*/

/* Create indice*/
pool.acquire(function(err, client){
  client.indices.exists(
    {
      "index": ["dyson"]
    }
  ).then(function(body){
    if (!body) {
      console.log("Index not exist!!! create it.");
      client.indices.create({
        "index":"dyson"
      }).then(function(data){
        if(data.acknowledged) console.log("project index created");
        else console.log("project index create failure" + data);
        pool.release(client);
      });
    }else{
      console.log("Index exists.");
      pool.release(client);
    }
  });
});

function response_db_error(res, status_code, message)
{
  var message  = {
    message: message
  };
  res.send(message).status(status_code);
}

router.post('/project/create', function(req, res, next) {
  pool.acquire(function(err, client) {
    if (err) {
      response_db_error(res, 500, "out of db connection!");
    }else {
      pool.release(client);
    }
  });
});

router.get('/list_project', function(req, res, next) {
  pool.acquire(function(err, client) {
    if (err) {
      response_db_error(res, 500, "out of db connection!");
    }else {
      client.get ({
        index: "dyson",
        type: "project",
        id: "1"
      }).then(function(response){
        res.json(response._source.projects);
        pool.release(client);
      });
    }
  });
});

router.get('/list_package', function(req, res, next) {
  name = req.query.project;
  pool.acquire(function(err, client) {
    if (err) {
      response_db_error(res, 500, "out of db connection!");
    }else {
      client.search ({
        index: "dyson",
        type: "project_detail",
        query: {
          "filtered" : {
            "filter" : {
              "project_name" : name
            }
          }
        }
      }).then(function(response){
        if (response.hits.total > 0 ) {
          for (var i = 0 ; i < response.hits.hits.length ; i ++){
            //console.log(response.hits.hits[i]._source.project_name + "<\n");
            if(response.hits.hits[i]._source.project_name == name){
              res.send(response.hits.hits[i]._source.packages);
              break;
            }
          }
        }else{
          res.send([]);
        }
        pool.release(client);
      });
    }
  });
});

router.post('/report', function(req, res, next) {
  body = req.body;
  //console.log(body);
  pool.acquire(function(err, client) {
    if (err) {
      response_db_error(res, 500, "out of db connection!");
    }else {
      var data = body;
      client.index ({
        index: "dyson",
        type: "report",
        id: req.body.host,
        body: data
      }).then(function(response){
        console.log("response:" + response);
        res.send({result: response, code: 200});
        pool.release(client);
      });
    }
  });
});

router.get('/list', function(req,res, next) {
  host = req.query.project;
  pool.acquire(function(err, client){
    if (err) {
      response_db_error(res, 500, "out of db connection!");
    }else {
      client.search({
        index: 'dyson',
        type: 'report',
        query: {
          "filtered" : {
            "filter" : {
              "host" : host
            }
          }
        }
      }).then(function(response){
        if (response.hits.total > 0) {
          data = response.hits.hits;
          res.json(data);
        }else{
          res.json([]);
        }
      });
    }
  });
});

router.get('/search', function(req, res, next) {
  project = null;
  if (req.query.project) {
    project = req.query.project;
    console.log("project = " + project);
  }
  var type = null;
  if (req.query.type) {
    type = req.query.type;
  }
  var pkg = null;
  if (req.query.package) {
    pkg = req.query.package;
  }
  pool.acquire(function(err, client) {
    if (err) {
      response_db_error(res, 500, "out of db connection!");
    }else {
      client.search({
        index: 'dyson',
        type: 'report',
        size: 100,
        query: {
          "filtered" : {
            "filter" : {
              "packages" : {
                type : [pkg]
              }
            }
          }
        }

        //q: 'project:' + project
      }).then(function(response){
        //console.log(JSON.stringify(response));
        data = []
        if (response.hits.total > 0) {
          datas = response.hits.hits;
          for (var i = 0 ; i < response.hits.total ; i++) {
            ps = datas[i]._source[type];
            for (var idx = 0; idx < ps.length ; idx ++) {
              if(ps[idx].package == pkg){
                data.push({'host':datas[i]._source.host, 'version':ps[idx].version});
              }
            }
            data.sort(function(a, b){return -a.host.localeCompare(b.host);});
          }
          res.json(data);
        }else{
          res.json([]);
        }
      });
      pool.release(client);
    }
  });
});

module.exports = router;
