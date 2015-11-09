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
    client.end(); 
  },
  max      : 10,
  // optional. if you set this, make sure to drain() (see step 3)
  min      : 2, 
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

router.post('/report', function(req, res, next) {
  body = req.body;
  pool.acquire(function(err, client) {
    if (err) {
      response_db_error(res, 500, "out of db connection!");
    }else {
      var data = {
        host: body.host,
        packages: {
          apt:body.apt,
          python:body.python
        }
      };
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

module.exports = router;
