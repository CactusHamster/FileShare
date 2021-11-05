require('colors')
const paths = require('path')
const { statSync, createReadStream } = require('fs')
const { EventEmitter } = require('events');
const { readdir } = require('fs/promises')
let testmode = (process.argv.includes('-t') || process.argv.includes('--test'))
if (testmode) console.info('Running with testmode!'.brightGreen)

let pingTimeoutMinutes = 15

function internalError(res) {
	res.writeHead(500,{'Content-Type':'text/plain'});
	res.end('internal server error')
}


class api extends EventEmitter {
	constructor () {
		super()
		this.clients = {}
		this.blacklist = require('./blacklist.json')
	}
	
	checkIp (ip, res) {
		if (!Object.keys(this.clients).includes(ip)) {
			if (testmode) {
				this.connect({}, {writeHead: function () {}, end: () => {}}, ip, {name: 'test user'})
				return true
			}
			res.writeHead(403,{'Content-Type':'text/plain'});
			res.end('unauthorized')
			return false
		}
		return true
	}
	
	connect (req, res, ip, query) {
		ip = query.ip ?? ip
		/*if (ip == "::1") {
			res.writeHead(403,{'Content-Type':'text/plain'});
			res.end('invalid')
			return false;
		}*/
		if (this.blacklist.includes(ip)) {
			res.writeHead(403,{'Content-Type':'text/plain'});
			res.end('unauthorized')
			return false;
		}
		if (Object.keys(this.clients).includes(ip)) {
			res.writeHead(202,{'Content-Type':'text/plain'});
			res.end('already connected')
			return false;
		}
		if (query.name == null || query.name == undefined) {
			res.writeHead(400,{'Content-Type':'text/plain'});
			res.end('no name provided')
			return false;
		}
		this.clients[ip] = { name: query.name, cmdData: [], ping: null, pinged: true } ?? { name: null, ping: null, cmdData: [], pinged: true }
		console.info(`login::::::::${ip} has logged in as ${this.clients[ip].name}`)
		res.writeHead(200,{'Content-Type':'text/plain'})
		this.emit('ping', req, res, ip, true)
		res.end('success')
	}
	
	disconnect (req, res, ip) {
		if (!Object.keys(this.clients).includes(ip)) {
			res.writeHead(404,{'Content-Type':'text/plain'});
			res.end('no ip found')
			return;
		}
		console.info(`login::::::::${ip} has logged out of ${this.clients[ip]}`)
		delete this.clients[ip];
		res.writeHead(200,{'Content-Type':'text/plain'});
		res.end('success')
	}
	
	async readFiles (req, res, ip, query) {
		if (!this.checkIp(ip, res)) return;
		var path = query.path ?? process.cwd()
		path = paths.resolve(path);
		try {
			const files = await readdir(path);
			let filesData = []
			files.forEach((item, i) => {
				try {
					var p = String(paths.resolve(path)+"\\"+item).replace(/\\/g, '/')
					let info = statSync(p)
					//console.info(p)
					filesData.push({
						name: item,
						path: p,
						folder: info.isDirectory()
					});
				}
				catch (e) {
					//console.info(e)
				}
			});
			
			res.writeHead(200,{'Content-Type':'application/json'});
			res.end(JSON.stringify(filesData, null, '  '))
		} catch (err) {
			res.writeHead(500,{'Content-Type':'text/plain'});
			res.end('internal server error'+'\n'+err)
			//console.info(err)
		}
	}
	
	async download (req, res, ip, query) {
		if (!this.checkIp(ip, res)) return;
		var path = query.path
		if (path == undefined || path == null) {
			res.writeHead(500,{'Content-Type':'text/plain'});
			res.end('internal server error')
		}
		try {
			//console.info(query.path)
			var stat = statSync(path)
			if (stat == undefined) throw 'invalid file'
			res.writeHeader(200, {"Content-Length": stat.size});
			var stream = createReadStream(path)
			stream.on('error', function (e) {
				internalError(res)
			})
			stream.on('data', function (chunk) {if(!res.write(chunk)) stream.pause()});
			stream.on('end', function () {res.end()});
			res.on("drain", function () {stream.resume()});
		}
		catch (e) {
			//console.info(e)
			internalError(res)
		}
	}
	
	
	async delete (req, res, ip, query) {
		var path = query.path
		if (path == undefined || path == null) {
			internalError(res)
		}
		try {
			unlinkSync(path);
			res.writeHead(200, {'Content-Type':'text/plain'});
			res.end('success')
		} catch (err) {
			internalError(res)
		}
	}
	
	
	
	
	
	
	
	
	apiHandle(req, res, url, ip) {
		if (url.pathname.startsWith("/api/connect")) {
			this.connect(req, res, ip, url.query)
		}
		//if (!this.checkIp(ip, res)) return;
		else if (url.pathname.startsWith('/api/disconnect')) {
			this.disconnect(req, res, ip)
		}
		else if (url.pathname.startsWith('/api/dir') || url.pathname.startsWith('/api/getfiles') || url.pathname.startsWith('/api/readfiles')) {
			if (!this.checkIp(ip, res)) return;
			this.readFiles(req, res, ip, url.query)
		}
		else if (url.pathname.startsWith('/api/download')) {
			if (!this.checkIp(ip, res)) return;
			this.download(req, res, ip, url.query)
		}
		else if (url.pathname.startsWith('/api/cwd')) {
			if (!this.checkIp(ip, res)) return;
			res.writeHead(200,{'Content-Type':'application/json'});
			res.end(JSON.stringify({"path": process.cwd()}, null, '  '))
		}
		else if (url.pathname.startsWith('/api/ping')) {
			if (!this.checkIp(ip, res)) return;
			this.emit('ping', req, res, ip)
		}
		else if (url.pathname.startsWith('/api/clients')) {
			res.writeHead(200,{'Content-Type':'application/json'});
			res.end(JSON.stringify(Object.keys(this.clients), null, '  '))
		}
		else if (url.pathname.startsWith('/api/cmdstop')) {
			if (!this.checkIp(ip, res)) return;
			this.emit('cmdstop', req, res, url, ip)
		}
		else if (url.pathname.startsWith('/api/cmdclear')) {
			if (!this.checkIp(ip, res)) return;
			this.emit('cmdclear', req, res, url, ip)
		}
		else if (url.pathname.startsWith('/api/cmddata')) {
			if (!this.checkIp(ip, res)) return;
			this.emit('cmddata', req, res, url, ip)
		}
		else if (url.pathname.startsWith('/api/cmd')) {
			if (!this.checkIp(ip, res)) return;
			this.emit('cmd', req, res, url, ip)
		}
		else if (url.pathname.startsWith('/api/write')) {
			if (!this.checkIp(ip, res)) return;
			this.emit('writeFile', req, res, url, ip)
		}
		else {
			res.end('no command found')
		}
	}
}

api = new api()

api.on('ping', function (req, res, ip, end=false) {
	let ping = this.clients[ip].ping
	this.clients[ip].pinged = true
	if (ping != null) clearTimeout(this.clients[ip].ping)
	let falsify = function () {
		try {api.clients[ip].pinged = false;
		delete api.clients[ip];
		console.info(`login::::::::${ip} has logged out of ${this.clients[ip]} (ping timeout)`)
		}
		catch (e) {}
		//console.info('delet')
	}
	falsify.bind({ip: ip})
	
	this.clients[ip].ping = setTimeout(falsify, pingTimeoutMinutes * 1000 * 60)
	
	if (!end) {
		res.writeHead(200, {'Content-Type':'text/plain'});
		res.end('pong')
	}
})






//process.stdin.write(data)

let { spawn } = require('child_process')
api.on('cmd', function (req, res, url, ip) {
	let cmd = url.query.cmd
	let dir = String(url.query.dir)
	if (cmd == null || cmd == undefined) {
		res.writeHead(400,{'Content-Type':'text/plain'});
		res.end('no cmd command provided')
		return;
	}
	if (api.clients[ip].cmdRunning) {
		cmd = String(cmd)
		/*res.writeHead(400,{'Content-Type':'text/plain'}); res.end('cmd already running')*/
		api.clients[ip].cmd.stdin.write(cmd)
		res.writeHead(200,{'Content-Type':'text/plain'});
		res.end('command written')
		return;
	}
	cmd = String(cmd)
	api.clients[ip].cmdRunning = true
	cmd = String(cmd).split(' ')
	c = cmd[0]
	cmd.shift()
	console.info(c, cmd)
	console.info(dir)
	try {
		api.clients[ip].cmd = spawn(String(c), cmd, { cwd: dir, windowsHide: false, env: {} })
	} catch (e) {
		res.writeHead(400,{'Content-Type':'application/json'});
		res.end(JSON.stringify(e))
		return;
	}
	api.clients[ip].cmd.stdout.on('data', function (data) {
		api.clients[ip].cmdData.push('DATA:::'+data.toString())
	})
	
	api.clients[ip].cmd.stderr.on('data', (data) => {
		api.clients[ip].cmdData.push('ERR:::'+data.toString())
	});
	api.clients[ip].cmd.on('error', (err) => {
		api.clients[ip].cmdData.push('CRITERR:::'+err.toString())
	});
	
	api.clients[ip].cmd.on('close', function (code) {
		api.clients[ip].cmdData.push('EXIT:::'+code)
		api.clients[ip].cmdRunning = false
	})
	
	res.writeHead(200,{'Content-Type':'application/json'});
	res.end(JSON.stringify(api.clients[ip].cmdData))
})


api.on('cmddata', function (req, res, url, ip) {
	res.writeHead(200,{'Content-Type':'application/json'});
	res.end(JSON.stringify(api.clients[ip].cmdData))
	return;
})
api.on('cmdclear', function (req, res, url, ip) {
	api.clients[ip].cmdData = []
	res.writeHead(200,{'Content-Type':'text/plain'});
	res.end('success')
	return;
})

api.on('cmdstop', function (req, res, url, ip) {
	if (api.clients[ip].cmd == undefined || api.clients[ip].cmd == null) {
		res.writeHead(200,{'Content-Type':'text/plain'});
		res.end('nothing running')
		return
	}
	api.clients[ip].cmd.exit()
	res.writeHead(200,{'Content-Type':'text/plain'});
	res.end('success')
	
	
} )



api.on('writeFile', function (req, res, url, ip) {
	res.writeHead(200,{'Content-Type':'text/plain'});
	res.end('success')
})






//apiClass = new api()
module.exports = api