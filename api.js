const events = require('events');

const path = require('path');

const fs = require('fs');

const host = "::1";

const Client = require('./client.js');

let currentId = 0;



class FilePermission {
  Path = "";
  Read = true;//Read files..
  Write = false;//Write to files
  Execute = false;//Exec files...
  ReadDir = true;//Read directory.
  Delete = true;//Delete files...

  constructor(p,r,w,e) {
    this.Path = path.resolve(p);
    this.Read = r;
    this.Write = w;
    this.Execute = e;
  }

  InPath(p) {
    return p.startsWith(this.Path);
  }

}




class Server {
  static Clients = [];
  static ServerEvent = new events.EventEmitter();

  static HandleRequest(req,res,url,ip) {
    let q = url.query ?? {Name:"null"};

    if (url.pathname.startsWith("/api/connect")) {this.ServerEvent.emit("connect",req,res,url,q.Name,ip);return;}

    if (url.pathname.startsWith("/api/disconnect")) {this.ServerEvent.emit("disconnect",req,res,url,ip);return;}

    if (url.pathname.startsWith("/api/isconnected")) {this.ServerEvent.emit("isconnected",req,res,url,ip);return;}

    if (url.pathname.startsWith("/api/ping")) {this.ServerEvent.emit("ping",req,res,url,ip);return;}

    if (url.pathname.startsWith("/api/dir")) {this.ServerEvent.emit("dir",req,res,url,ip);return;}

    if (url.pathname.startsWith("/api/cwd")) {this.ServerEvent.emit("cwd",req,res,url,ip);return;}

    if (url.pathname.startsWith("/api/readfile")) {this.ServerEvent.emit("readfile",req,res,url,ip);return;}
    this.ServerEvent.emit('error','Failed to access api.',400,req,res);
  }



}


Server.ServerEvent.on('connect', (req,res,url,name,ip)=> {
  if (Server.Clients.length>5) {Server.ServerEvent.emit('error','Too many clients are connected!',400,req,res);return;}

  let item = Server.Clients.find(elem => elem.Ip==ip);

  if (item!=undefined) {
    //error
    res.writeHead(400,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'Failed to connect, already connected!',Error:true}));
    return;
  }

  let cli = new Client(ip,name,currentId);
  cli.FilePermissions = [new FilePermission('/',true,true,true)];
  currentId++;
  Server.Clients = Server.Clients.concat(cli);


  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end(JSON.stringify({Id:cli.Id,Message:'Sucessfully connected!',Error:false}));
});

Server.ServerEvent.on('disconnect', (req,res,url,ip) => {
  let item = Server.Clients.findIndex(elem => elem.Ip==ip);

  if (item==-1) {
    //error
    res.writeHead(400,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'Failed to disconnect, not connected yet!',Error:true}));
    return;
  }

  console.info('[INFO] Client left!')

  Server.Clients.splice(item,1);
  res.writeHead(200,{'Content-Type':'text/plain'});
  res.end(JSON.stringify({Message:'Sucessfuly disconnected!',Error:false}));


});

Server.ServerEvent.on('isconnected', (req,res,url,ip) => {
  let item = Server.Clients.findIndex(elem => elem.Ip==ip);

  if (item==-1) {
    //error
    res.writeHead(200,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'Not connected!',Connected:false}));
    return;
  }

  res.writeHead(200,{'Content-Type':'text/plain'});
  res.end(JSON.stringify({Message:'Connected!',Connected:true}));


});


Server.ServerEvent.on('ping', (req,res,url,ip) => {


  let item = Server.Clients.find(elem => elem.Ip==ip);
  if (item==undefined) {
    //error
    res.writeHead(400,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'Failed to \'keep-alive\' client, not connected!',Error:true}));
    return;
  }

  //item is client, update last-ping message.
  item.LastPing = Date.now();
  res.writeHead(200,{'Content-Type':'text/plain'});
  res.end(JSON.stringify({Message:'Ping complete.',Error:false}));
});

Server.ServerEvent.on('readfile',(req,res,url,ip) => {//READ FILE THINGY

  let item = Server.Clients.find(elem => elem.Ip==ip);
  if (item==undefined) {
    //error
    res.writeHead(400,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'Failed to read file, client not connected!',Data:[],Error:true,Code:'NOT_CONNECTED'}));
    return;
  }

  let q = url.query ?? {Path:"./file"};

  if (q.Path==undefined) {q.Path = "./file";}



  let p = path.resolve(q.Path);


  let perm = item.FilePermissions.find(elem => elem.InPath(p));

  if (perm==undefined) {
    //error
    res.writeHead(401,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'No file permissions!',Error:true,Code:'ACCESS_DENIED',Data:[]}));
    return;
  }

  if (!fs.existsSync(p)) {
    res.writeHead(400,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'Error file doesn\'t exist',Data:[],Error:true,Code:'FILE_NOT_FOUND'}));
    return;
  }

  let s = fs.statSync(p);


  if (!s.isFile()) {
    res.writeHead(401,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'Error attempting to read folder as a file!',Data:[],Error:true,Code:'NOT_FILE'}));
    return;
  }


    res.writeHead(200,{'Content-Type':'text/plain'});

    var fReadStream = fs.createReadStream(p);//totally not taken from: https://stackoverflow.com/questions/20875314/download-large-file-from-node-http-server-the-server-out-of-memory
    fReadStream.on('data', function (chunk) {
    if(!res.write(chunk)){
      fReadStream.pause();
    }
    });
  fReadStream.on('end', function () {
   res.end();
  });
  res.on("drain", function () {
   fReadStream.resume();
  });


});

Server.ServerEvent.on('dir',(req,res,url,ip) => {//HAS ERROR CODE
  let item = Server.Clients.find(elem => elem.Ip==ip);
  if (item==undefined) {
    //error
    res.writeHead(400,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'Failed to read directory, client not connected!',Data:[],Error:true,Code:'NOT_CONNECTED'}));
    return;
  }

  let q = url.query ?? {Path:"./file"};

  if (q.Path==undefined) {q.Path = "./file";}



  let p = path.resolve(q.Path);


  let perm = item.FilePermissions.find(elem => elem.InPath(p));

  if (perm==undefined||!perm.ReadDir) {
    //error
    res.writeHead(401,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'No file permissions!',Error:true,Code:'ACCESS_DENIED',Data:[]}));
    return;
  }

  if (!fs.existsSync(p)) {
    res.writeHead(400,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'Error folder doesn\'t exist',Data:[],Error:true,Code:'FOLDER_NOT_FOUND'}));
    return;
  }

  let s = fs.statSync(p);

  if (s.isFile()) {
    res.writeHead(401,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'Error attempting to read file as directory!',Data:[],Error:true,Code:'NOT_DIRECTORY'}));
    return;
  }

  fs.promises.readdir(p).then((d) => {
    //res.writeHead(200,{'Content-Type':'text/plain'});
    //res.end(JSON.stringify({Message:'Sucessfully read directory!',Data:d,Error:false,Code:'NONE'}));

    let out = [];

    d.forEach((item, i) => {
      let stat = fs.statSync(path.resolve(p)+"/"+item);
      out = out.concat({Name:item,IsFolder:stat.isDirectory()});
    });


    res.writeHead(200,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'Sucessfully read directory!',Data:out,Error:false,Code:'NONE'}));

  }).catch((e) => {
    res.writeHead(400,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'Error reading directory.',Data:[],Error:true,Code:'INTERNAL_ERROR'}));
  });


});




Server.ServerEvent.on('cwd',(req,res,url,ip) => {//HAS ERROR CODE

  res.writeHead(200,{'Content-Type':'text/plain'});
  let q = url.query ?? {Path:"./file"};
  if (q.Path==undefined) {q.Path = "./file";}
  res.end(path.posix.resolve(q.Path));



});








Server.ServerEvent.on('deletefile',(req,res,url,ip) => {//HAS ERROR CODE
  let item = Server.Clients.find(elem => elem.Ip==ip);
  if (item==undefined) {
    //error
    res.writeHead(400,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'Failed to read directory, client not connected!',Data:[],Error:true,Code:'NOT_CONNECTED'}));
    return;
  }

  let q = url.query ?? {Path:"./file"};

  if (q.Path==undefined) {q.Path = "./file";}



  let p = path.resolve(q.Path);


  let perm = item.FilePermissions.find(elem => elem.InPath(p));

  if (perm==undefined||!perm.Delete) {
    //error
    res.writeHead(401,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'No file permissions!',Error:true,Code:'ACCESS_DENIED',Data:[]}));
    return;
  }

  if (!fs.existsSync(p)) {
    res.writeHead(400,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'Error file doesn\'t exist',Data:[],Error:true,Code:'FILE_NOT_FOUND'}));
    return;
  }

  let s = fs.statSync(p);


  fs.promises.readdir(p).then((d) => {
    //res.writeHead(200,{'Content-Type':'text/plain'});
    //res.end(JSON.stringify({Message:'Sucessfully read directory!',Data:d,Error:false,Code:'NONE'}));

    let out = [];

    d.forEach((item, i) => {
      let stat = fs.statSync(path.resolve(p)+"/"+item);
      out = out.concat({Name:item,IsFolder:stat.isDirectory()});
    });


    res.writeHead(200,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'Sucessfully read directory!',Data:out,Error:false,Code:'NONE'}));

  }).catch((e) => {
    res.writeHead(400,{'Content-Type':'text/plain'});
    res.end(JSON.stringify({Message:'Error reading directory.',Data:[],Error:true,Code:'INTERNAL_ERROR'}));
  });


});









Server.ServerEvent.on('error', (msg,code,req,res)=> {
  res.writeHead(code,{'Content-Type':'text/plain'});
  res.end(`ERROR ${code}\n${msg}`);
});


module.exports = Server;


//Ping stuff:
setInterval(function () {
  for (var i = 0; i < Server.Clients.length; i++) {
    let c = Server.Clients[i];
    if ((c.LastPing+60*1000)<Date.now()) {console.info(`[INFO] Client left!`);Server.Clients.splice(i,1);i--;}
  }

},30*1000);
