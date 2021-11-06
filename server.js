let http = require('http');
let PORT = process.env.PORT ?? 8080
let URL = require('url');
const { readFile, readFileSync } = require('fs');
let favicon = readFileSync('./favicon.ico');
let api = require('./api.js')
let testmode = (process.argv.includes('-t') || process.argv.includes('--test'))
require('colors')

function sendfile (req, res, file) {
	readFile(file, function (err, data) {
		if (err) {
			res.writeHead(404,{'Content-Type':'text/html','Location':'/f/404.html'});
			res.end('ERROR 404: FILE NOT FOUND');
			return;
		}
		if (file.endsWith('.html')) {res.writeHead(200,{'Content-Type':'text/html'})}
		else if (file.endsWith('.js')) {res.writeHead(200,{'Content-Type':'text/javascript'})}
		else if (file.endsWith('.css')) {res.writeHead(200,{'Content-Type':'text/css'})}
		else {res.writeHead(200,{'Content-Type':'text/plain'})}
		res.end(data)
	})
}




http.createServer((req/*, {maxHeaderSize: 6000000000}*/, res)=>{
	let ip = req.socket.remoteAddress;
	let url = URL.parse(req.url,true);
	if (testmode) console.info(req.url.toString().blue)
	if (url.pathname === "/") {
		sendfile(req, res, './main.html');
		return;
	}
	else if (url.pathname.startsWith("/api/")) {
		//console.info(url.query)
		api.apiHandle(req,res,url,ip);
		return;
	} else if (url.pathname.startsWith("/f/")) {
		sendfile(req, res, '.'+url.pathname);
		return;
	} 
	else if (url.pathname=="/favicon.ico") {
		res.writeHead(200,{'Content-Type':'text/plain'});
		res.end(favicon);
		return;
	}
	else {
		sendfile(req, res, './f/404.html');
		return;
	}
	
}).listen(PORT)