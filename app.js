'use strict'

var auth = require('basic-auth');
var express = require('express');
var fs = require('fs');
var helmet = require('helmet');
var md5 = require('md5');
var node_getopt = require('node-getopt');
var path = require('path');
var portscanner = require('portscanner');
var Client = require('ssh2').Client;
var wol = require('wake_on_lan');

// Defaults
var default_config_path = process.env['HOME'] + "/.config/switch-board/config.json";
var default_port = 3000;
var default_sshkey_path = process.env['HOME'] + "/.ssh/id_rsa";
var default_sshport = 22;
var default_poweroff_command = "sudo poweroff";

// parse options
var opt = node_getopt.create([
  ['c' , 'config=ARG'          , 'configuration file'],
  ['h' , 'help'                , 'display this help']
]).bindHelp().parseSystem();

// parse the configuration file
var config = JSON.parse(fs.readFileSync(opt.options.config || default_config_path));
if (!config.port) {
  config.port = default_port;
}
for (var i = 0; i < config.hosts.length; i++) {
  var host = config.hosts[i];
  host.id = String(i);
  if (!host.sshport) {
    host.sshport = default_sshport;
  }
  if (!host.sshkey) {
    if (fs.existsSync((default_sshkey_path))) {
      host.sshkey = default_sshkey_path;
    } else {
      console.log("Error: no ssh password or key");
      process.exit(1);
    }
  }
  if (!host.poweroff_command) {
    host.poweroff_command = default_poweroff_command;
  }
  host.users = [];
}

// helper fulctions
function get_valid_host(id, res) {
  var host = config.hosts.find(function(host) {
    return id === host.id;
  });
  if (!host) {
    res.send({
      status: 'error',
      message: 'Host not defined'
    });
    return undefined;
  } else {
    return host;
  }
}

function get_user(username) {
  return config.users.find(function(user) {
      return username === user.username;
  });
}

function get_user_from_req(req) {
  var input = auth(req);
  if (input) {
    return get_user(input['name']);
  }
  return undefined;
}

function get_valid_host_status(host, res, callback) {
  portscanner.checkPortStatus(host.sshport, host.hostname, function(err, status) {
    if (err) {
      res.send({
        status: 'error'
        //message: err.code
      });
    } else if (status === 'open') {
      callback('online');
    } else if (status === 'closed') {
      callback('offline');
    } else {
      callback(status);
    }
  });
}

function poweroff_host(host, res) {
  var conn = new Client();
  conn.on('ready', function() {
    conn.exec(host.poweroff_command, function(err, stream) {
      if (err) {
        res.send({
          status: 'error'
          //message: err.message
        });
      } else {
        res.send({ status: 'success' });
      }
      conn.end();
    });
  });
  conn.on('error', function(err) {
    res.send({
      status: 'error'
      //message: err.message
    });
  });
  conn.connect({
    host: host.hostname,
    port: host.sshport,
    username: host.sshuser,
    privateKey: fs.readFileSync(host.sshkey),
    readyTimeout: 1000
  });
}

function poweron_host(host, res) {
  wol.wake(host.macaddress, function(err) {
    if (err) {
      res.send({
        status: 'error'
        //message: 'Unknown error'
      });
    } else {
      res.send({ status: 'success' });
    }
  });
}

// set up express
var app = express();
app.use(helmet());
app.use(function(req, res, next) {
  var input = auth(req);
  if (input) {
    var user = get_user(input['name']);
  }
  if (!user || user.password !== (user.password_encoding === 'md5' ?
        md5(input['pass']) : input['pass'])) {
      res.statusCode = 401;
      res.setHeader('WWW-Authenticate', 'Basic realm="switch-board"');
      res.end('Unauthorized');
  } else {
      next();
  }
});

// redirect users
app.get('/', function (req, res) {
  res.redirect(301, '/switch-board');
});

// serve the client
app.use('/switch-board', express.static(path.join(__dirname, 'public')));

// listen for hosts requests
app.get('/switch-board/api/hosts', function (req, res) {
  res.send(config.hosts.map(function(host) {
    return {
      id: host.id,
      name: host.name,
    };
  }));
});

// listen for user requests
app.get('/switch-board/api/user', function (req, res) {
  var user = get_user_from_req(req);
  res.send({
    admin: (user.admin ? true : false)
  });
});

// Listen for host status requests
app.get('/switch-board/api/status/:hostId', function (req, res) {
  if (host = get_valid_host(req.params.hostId, res)) {
    get_valid_host_status(host, res, function(status) {
      var user = get_user_from_req(req);
      var response = {
        status: status,
        using: false
       };
      response.users = host.users.map(function(elem) {
        if (elem.username === user.username) {
          response.using = true;
        }
        return elem.name
      });
      res.send(response);
    });
  }
});

app.post('/switch-board/api/usehost/:hostId', function (req, res) {
  if (host = get_valid_host(req.params.hostId, res)) {
    get_valid_host_status(host, res, function(status) {
      var user = get_user_from_req(req);
      var found = host.users.find(function(elem) {
        return user.username === elem.username;
      });
      if (!found) {
        host.users.push({
          username: user.username,
          name: user.name
        });
      }
      if (status !== 'online') {
        poweron_host(host, res);
      } else {
        res.send({ status: 'success' });
      }
    });
  }
});

app.post('/switch-board/api/unusehost/:hostId', function (req, res) {
  if (host = get_valid_host(req.params.hostId, res)) {
    var user = get_user_from_req(req);
    host.users = host.users.filter(function(elem) {
      return elem.username !== user.username;
    });
    if (host.users.length === 0) {
      poweroff_host(host, res);
    } else {
      res.send({ status: 'success' });
    }
  }
});

app.post('/switch-board/api/poweron/:hostId', function (req, res) {
  if (host = get_valid_host(req.params.hostId, res)) {
    if (!get_user_from_req(req).admin) {
      res.send({
        status: 'error',
        message: 'Only admins can poweron directly'
      });
    } else {
      get_valid_host_status(host, res, function(status) {
        poweron_host(host, res);
      });
    }
  }
});

// listen for poweroff requests
app.post('/switch-board/api/poweroff/:hostId', function (req, res) {
  if (host = get_valid_host(req.params.hostId, res)) {
    if (!get_user_from_req(req).admin) {
      res.send({
        status: 'error',
        message: 'Only admins can poweroff directly'
      });
    } else {
      host.users = [];
      poweroff_host(host, res);
    }
  }
});

// listen for requests
app.listen(config.port, function () {
  console.log('Listening on port ' + config.port);
});
