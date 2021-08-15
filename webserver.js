let http = require('http');

let url = require('url');
let fs = require('fs');

let clients = [];

globalThis.fullPerm = process.argv.includes('-f');

let api = require('./api.js');

let ico = fs.readFileSync('./folder.ico');



//create a server object:
http.createServer(function (req, res) {
  let u = url.parse(req.url,true);
  let ip = req.connection.remoteAddress;


  if (u.pathname.startsWith('/api/')) {
  api.HandleRequest(req,res,u,ip);
  return;
  } else if (u.pathname=="/") {
    //Load this file: '/file/index.html'

    //res.writeHead(200,{'Content-Type':'text/html'});
    //res.end(fs.readFileSync('./file/index.html'));

    /*fs.promises.readFile('./file/index.html').then((d) => {
      res.writeHead(200,{'Content-Type':'text/html'});
      res.end(d);
    }).catch((e) => {
      api.ServerEvent.emit('error','File not found.',404,req,res);
    });

    return;*/

    res.writeHead(301,{'Content-Type':'text/html','Location':'/file/index.html'});
    res.end('If redirect failed click here:\n<a href="/file/index.html">PAGE</a>');

    return;

  } else if (u.pathname.startsWith('/file/')) {
    //Load file..

    let unknownType = true;


    fs.promises.readFile('./'+u.pathname).then((d) => {
      if (u.pathname.endsWith('.html')) {res.writeHead(200,{'Content-Type':'text/html'});unknownType = false;}
      if (u.pathname.endsWith('.js')) {res.writeHead(200,{'Content-Type':'text/javascript'});unknownType = false;}

      if (unknownType) {res.writeHead(200,{'Content-Type':'text/plain'});}

      res.end(d);
    }).catch((e) => {
      api.ServerEvent.emit('error','File not found.',404,req,res);
    });



    return;
  } else if (u.pathname=="/favicon.ico") {
    res.writeHead(200,{'Content-Type':'text/plain'});
    res.end(ico);
    return;
  }


  api.ServerEvent.emit('error','The server cannot complete the request.',400,req,res);


}).listen(8080); //the server object listens on port 8080
