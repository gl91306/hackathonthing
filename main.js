const http = require("http");
var https = require('follow-redirects').https;
const fs = require('fs');
var mime = require('mime');
var WebSocketServer = require('ws').WebSocketServer;
const TokenGenerator = require('uuid-token-generator');

const tokgen2 = new TokenGenerator(256, TokenGenerator.BASE62);

// server
function heartbeat() {
  this.isAlive = true;
}

const wss = new WebSocketServer({ port: 8080 });
var players = []

wss.on('connection', function connection(ws) {
  ws.isAlive = true;
  ws.on('error', console.error);
  ws.on('pong', heartbeat);
  ws.on("close", function() {
    console.log(ws.ide + " is dead")
    for (var i in players) {
      if (players[i].id == ws.ide) {
        console.log("sending kill req to " + ws.ide)
        players.splice(i, 1);
        wss.clients.forEach(function each(ws) {
          var otherData = []
          for (var i in players) {
            if (players[i].id == ws.ide) {

            } else {
              otherData.push(players[i])
            }
          }
          ws.send(JSON.stringify(otherData));
        })
      }
    }
  });
  ws.on('message', function message(data) {
    if (data.includes('Id: ')) {
      var playerId = data.toString().split('Id: ')[1];
      var playerData = {
        id: playerId,
        position: {x: 0, y: 0, z: 0},
        quaternion: {x: 0, y: 0, z: 0}
      }
      players.push(playerData)
      console.log('received: %s', data);
      ws.ide = playerId;
    } else if (JSON.parse(data)) {
      var jsonData = JSON.parse(data);
      var otherData = []
      for (var i in players) {
        if (players[i].id == jsonData.id) {
          players[i].position.x = jsonData.position.x;
          players[i].position.y = jsonData.position.y;
          players[i].position.z = jsonData.position.z;
          
          players[i].quaternion.x = jsonData.quaternion.x;
          players[i].quaternion.y = jsonData.quaternion.y;
          players[i].quaternion.z = jsonData.quaternion.z;
        } else {
          otherData.push(players[i])
        }
      }
      ws.send(JSON.stringify(otherData));
    } else {
      ws.send('null')
    }
    //console.log('received: %s', data);
  });
});

const interval = setInterval(function ping() {
  console.log('ping')
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      console.log(ws.ide + " is dead")
      console.log("INTKILLED")
      for (var i in players) {
        if (players[i].id == ws.ide) {
          console.log("sending kill req to " + ws.ide)
          players.splice(i, 1);
          wss.clients.forEach(function each(ws) {
            var otherData = []
            for (var i in players) {
              if (players[i].id == ws.ide) {

              } else {
                otherData.push(players[i])
              }
            }
            ws.send(JSON.stringify(otherData));
          })
        }
      }
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping();
  });
}, 10000);

wss.on('close', function close() {
  clearInterval(interval);
});

// misc funcs
function toArrayBuffer(buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return arrayBuffer;
}

const host = '0.0.0.0';
const port = 8000;

const paths = [];

paths["/"] = function(req, res) {
  fs.promises.readFile(__dirname + "/index.html")
    .then(contents => {
      res.setHeader("Content-Type", "text/html");
      res.writeHead(200);
      res.end(contents);
    })
}

paths["/login"] = function(req, res) {
  fs.promises.readFile(__dirname + "/login.html")
    .then(contents => {
      res.setHeader("Content-Type", "text/html");
      res.writeHead(200);
      res.end(contents);
    })
}

paths["/signin"] = function(req, res) {
  fs.promises.readFile(__dirname + "/signin.html")
    .then(contents => {
      res.setHeader("Content-Type", "text/html");
      res.writeHead(200);
      res.end(contents);
    })
}


paths["/download"] = function(req, res) {
  var url = req.url.split("/download?")[1];
  console.log("[LOG] " + url);
  https.get(url, resp => {
    let data = [];

    // A chunk of data has been recieved.
    resp.on("data", chunk => {
      data.push(chunk);
    });

    // The whole response has been received. Print out the result.
    resp.on("end", () => {
      var buffer = Buffer.concat(data);
      console.log(toArrayBuffer(buffer).byteLength); 
      var contentType = resp.headers['content-type'];
      console.log("[LOG] " + data[0] + '...');
      res.setHeader("Content-Type", contentType);
      res.writeHead(200);
      res.end(buffer);
    });
  })
    .on("error", err => {
      console.log("Error: " + err.message);
    });
}

paths["/auth"] = function(req, res) {
  // query database

  var body = ''
  req.on('data', function(data) {
    body += data
    console.log('Partial body: ' + body)
  })
  req.on('end', function() {
    console.log(body)
    var responseJSON = JSON.parse(body);
    var type = responseJSON.type;

    let rawdata = fs.readFileSync('auth.json');
    let authDatabase = JSON.parse(rawdata);

    if (type == 'signin') {
      var user = responseJSON.user;
      var email = responseJSON.email;
      var password = responseJSON.password;

      if (!type || !user || !email || !password || (type == '') || (user == '') || (email == '') || (password == '')) {
        console.log('invalid data');
        console.log(type);
        console.log(user);
        console.log(email);
        console.log(password);
        res.setHeader("Content-Type", 'application/json');
        res.writeHead(400);
        var data = '-1'
        res.end(data);
        return;
      }

      for (var i in authDatabase) {
        if (authDatabase[i].user == user) {
          console.log('username taken');
          res.setHeader("Content-Type", 'application/json');
          res.writeHead(400);
          var data = '0'
          res.end(data);
          return;
        }
      }
      if (Object.keys(authDatabase).includes(email)) {
        console.log('email in use');
        res.setHeader("Content-Type", 'application/json');
        res.writeHead(400);
        var data = '1'
        res.end(data);
        return;
      }
      var token = tokgen2.generate();
      authDatabase[email] = {
        "user": user,
        "password": password,
        "authtoken": token
      }
      console.log('adding account');
      console.log(authDatabase)
      let rawDatae = JSON.stringify(authDatabase, null, 4);
      console.log(rawDatae)
      fs.writeFileSync('auth.json', rawDatae);
      res.setHeader("Content-Type", 'application/json');
      res.writeHead(200);
      var data = token;
      res.end(data);
      return;
    } else if (type == 'login') {
      var email = responseJSON.email;
      var password = responseJSON.password;

      if (!type || !email || !password || (type == '') || (email == '') || (password == '')) {
        console.log('invalid data');
        console.log(type);
        console.log(email);
        console.log(password);
        res.setHeader("Content-Type", 'application/json');
        res.writeHead(400);
        var data = '-1'
        res.end(data);
        return;
      }

      if (!Object.keys(authDatabase).includes(email)) {
        console.log('email not found');
        res.setHeader("Content-Type", 'application/json');
        res.writeHead(400);
        var data = '0'
        res.end(data);
        return;
      }

      if (authDatabase[email].password != password) {
        console.log('incorrect password');
        res.setHeader("Content-Type", 'application/json');
        res.writeHead(400);
        var data = '1'
        res.end(data);
        return;
      }

      var token = tokgen2.generate();
      authDatabase[email].authtoken = token;
      console.log('loging in account');
      console.log(authDatabase)
      let rawDatae = JSON.stringify(authDatabase, null, 4);
      console.log(rawDatae)
      fs.writeFileSync('auth.json', rawDatae);
      res.setHeader("Content-Type", 'application/json');
      res.writeHead(200);
      var data = token;
      res.end(data);
      return;
    } else if (type == 'auth') {
      var authy = responseJSON["auth"];
      for (var i in authDatabase) {
        if (authDatabase[i].authtoken == authy) {
          console.log('authorized');
          res.setHeader("Content-Type", 'application/json');
          res.writeHead(200);
          var data = authDatabase[i].user;
          res.end(data);
          return;
        }
      }
      console.log('unauth :C')
      res.setHeader("Content-Type", 'application/json');
      res.writeHead(200);
      var data = '0'
      res.end(data);
      return;
    }

  })
}

const requestListener = function(req, res) {
  console.log(req.url);
  if (fs.existsSync(__dirname + req.url) && fs.lstatSync(__dirname + req.url).isFile()) {
    fs.promises.readFile(__dirname + req.url)
      .then(contents => {
        res.setHeader("Content-Type", mime.getType(__dirname + req.url));
        res.writeHead(200);
        res.end(contents);
      })
  } else if (paths[req.url.split("?")[0]]) {
    paths[req.url.split("?")[0]](req, res);
  } else {
    fs.promises.readFile(__dirname + "/404.html")
      .then(contents => {
        res.setHeader("Content-Type", "text/html");
        res.writeHead(200);
        res.end(contents);
      })
  }

};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});