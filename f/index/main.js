let PATH = 'C:\\'

let download = (url, filename) => {
	console.info(url)
    let anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
};

let inter;
let cmdinter;
let cmdinterTime = 1000

let refreshDirInterval;
let refreshDirIntervalMS = 1000

function connect () {
	let value = document.getElementById('nameBox').value
	if (value == '' || value == null) {
		alert('You need to provide a login name!')
		return;
	}
	if (value.length < 3) {
		alert('Your name has to be longer than that!')
		return;
	}
	httpGetAsync(location.origin+"/api/connect?name="+value,function (data) {
		if (data === 'unauthorized') {
			alert('Failed to connect.\nReason: blacklisted')
			return false;
		}
		/*if (data === 'invalid') {
			httpGetAsync('https://ipapi.co/json/', function (data) {
				try {let ip = JSON.parse(data).ip}
				catch (e) {return alert('Failed to get valid remote address! Try disabling your ip tracking blockers.')}
				httpGetAsync(location.origin+"/api/connect?name="+value+"?ip="+ip,function (data2) {
					if (data === 'unauthorized') {
						alert('Failed to connect.\nReason: blacklisted')
						return false;
					}
					alert('Connected as '+String(value)+'!')
					listFiles()
				})
			})
		return false;
		}*/
		alert('Connected as '+String(value)+'!')
		listFiles()
		clearInterval(inter)
		clearInterval(refreshDirInterval)
		refreshDirInterval = setInterval(listFiles, refreshDirIntervalMS)
		inter = setInterval(function () {
			httpGetAsync(location.origin+"/api/ping", function (data) {
				if (data == 'unauthorized') {
					alert('Ping failed, disconnected!')
					nameBox.value = ''
					clearInterval(inter)
					clearInterval(cmdinter); cmdinter = null;
				}
				else if (data.includes('noSignOn')) {
					clearInterval(inter)
				}
			})
		}, 5*60*1000)
	})
}



function disconnect (hidealert=false) {
	httpGetAsync(location.origin+"/api/disconnect",
	function (data) {
		if (data.includes('no ip found')) return alert('You aren\'t connected!');
		if (hidealert) alert('Successfully disconnected!')
		clearInterval(inter)
		clearInterval(cmdinter); cmdinter = null;
		clearInterval(refreshDirInterval); refreshDirInterval = null;
	})

}













function listFiles() {
	let path = String(inputpath.value)
	PATH = path
	getDir((data) => {
	try {
		data = JSON.parse(data);
	} catch (e) {
		let out = "That directory doesn't exist!";
		if (data.includes('operation not permitted')) {out = "ACCESS DENIED"}
		if (data === 'unauthorized') {
			clearInterval(inter)
			clearInterval(cmdinter); cmdinter = null;
			clearInterval(refreshDirInterval); refreshDirInterval = null;	
			out = "403 Unauthorized"
		}
		else if (data.includes('resource busy or locked')) out = "That file is busy or locked!"
		
		return document.getElementsByClassName('file-explorer')[0].innerHTML = out;	
	}
	out = "<br>";
	data.forEach((item) => {
		if (item.folder) {
			out += `
					<div onclick="openFolder('${item.name}')" class='file' >
						<input type='checkbox' class="file-select" ></input>
						<img src="/f/folder.png" class='file-image'></img>
						<text class='file-text'>${item.name}</text>
					</div><br><br>`;
		} else {
			out += `
					<div class='file' onclick="download('/api/download?path=${item.path}','${item.name}');">
						<input type='checkbox' class="file-select" ></input>
						<img src="/f/file.png" class='file-image'></img>
						<text class='file-text'>${item.name}
					</div><br><br>`;
		}
	});
    document.getElementsByClassName('file-explorer')[0].innerHTML = out;
    inputpath.value = path;
  },path);
}

function openFolder (name) {
	console.info(inputpath.value)
	inputpath.value = String(inputpath.value)+'/'+String(name);
	listFiles()
}



function inputPath(e) {
	if (e.keyCode == 13) listFiles()
	//console.info(e.keyCode)
}

function backPath() {
	var t = String(inputpath.value).replace(/\\/g, '/')
	var c = t.match(/\//g).length 
	if (c == 1) {
		inputpath.value = t.slice(0, t.lastIndexOf('/')+1)
		listFiles()
		return;
	} else if (c < 1) {
		return;
	}
	var e = Math.max(t.lastIndexOf('/'), t.lastIndexOf('\\'))
	if (e < 1) return;
	inputpath.value = t.slice(0, e)
	listFiles()
}



function resetPath () {
	httpGetAsync(location.origin+'/api/cwd', function (data) {
		if (data === 'unauthorized') {
			document.getElementsByClassName('file-explorer')[0].innerHTML = '403 Unauthorized'
			return false;
		}
		data = JSON.parse(data)
		inputpath.value = String(data['path'])
		listFiles()
	})
}


function refreshcmd () {
	httpGetAsync(location.origin+'/api/cmddata', function (cmddata) {
		//console.info(cmddata)
		let d = document.getElementById('stdoutdiv')
		let d2 = []
		let jcmd = cmddata;
		if (cmddata == 'unauthorized') {
			clearInterval(cmdinter)
			clearInterval(inter)
			disconnect(true)
			//alert('Failed to fetch cmd data! Disconnecting you now.')
			return;
		}
		try {
			if (cmddata == '') {cmddata = "[]"}
			jcmd = JSON.parse(cmddata)
		}
		catch (e) {
			clearInterval(cmdinter)
			clearInterval(inter)
			disconnect(true)
			alert('Failed to fetch cmd data! Disconnecting you now.')
			console.info(cmddata)
			console.info(e)
			return false;
		}
		for (let cmd of jcmd) {
			cmd = String(cmd)
			.replace(/\n/g, '<br>:&nbsp;&nbsp;')
			let clr = "white"
			if (cmd.startsWith('ERR')) clr = "red"
			if (cmd.startsWith('CRITERR')) {
				clr = "grey"
				cmd = 'That command does not exist or you do not have permission to use it.'
			}
			if (cmd.startsWith('EXIT')) {
				if (!prCodeCheck.checked) continue;
				clr = "cyan"
				cmd = cmd.replace(/[^0-9]/g, '')
				cmd = `Process exited with code ${cmd}`
			}
			cmd = cmd
			.replace('CRITERR:::', '')
			.replace('DATA:::', '')
			.replace('ERR:::', '')
			d2.unshift(`<p style="text-align: left; color:${clr}"><font style="color: white">&gt;&nbsp;&nbsp;</font>${cmd}</p>`)
		}
		d.innerHTML = d2.join('\n')
	})
}

function cmd (command) {
	httpGetAsync(location.origin+'/api/cmd?cmd='+command+'&dir='+String(inputpath.value).replace(/\\/g, '/'), function (data) {
		let d = document.getElementById('stdoutdiv')
		if (data == 'unauthorized') return d.innerHTML = '<p style="color:white">403: UNAUTHORIZED</p>'+d.innerHTML
		d.innerHTML = data+d.innerHTML
		if (cmdinter == undefined || cmdinter == null) cmdinter = setInterval(refreshcmd, cmdinterTime)
	})
}

function clearcmd() {
	httpGetAsync(location.origin+'/api/cmdclear', function (data) {
		let d = document.getElementById('stdoutdiv')
		if (data == 'unauthorized') return d.innerHTML = '<p>403: UNAUTHORIZED</p>'+d.innerHTML
		d.innerHTML = '<p></p>'
	})
}





function cancelcmd() {
	httpGetAsync(location.origin+'/api/cmdstop', function (data) {
		let d = document.getElementById('stdoutdiv')
		if (data == 'unauthorized') return d.innerHTML = '<p>403: UNAUTHORIZED</p>'+d.innerHTML
		d.innerHTML = '<p></p>'
	})
}


let pastCommands = []
let pastIndex = -1
let tempcmd = ''
function cmdrecent (up=true) {
	if (up) pastIndex = Math.min(pastIndex+1, pastCommands.length-1)
	else pastIndex = Math.max(-1, pastIndex-1)
	if (pastIndex > -1) cmdin.value=pastCommands[pastIndex]
	else cmdin.value = tempcmd
	
	
}

cmdin.addEventListener('keydown', function (e) {
	if (e.keyCode == 13 && !e.shiftKey) {
		let s = String(cmdin.value)
		if (s != "")
		cmd(s)
		pastCommands.unshift(s)
		tempcmd = ''
		cmdin.value=''
		e.preventDefault()
	}
	else if (e.keyCode == 67 && e.ctrlKey) {
		cancelcmd(cmdin.value)
	}
	else if (e.key == 'ArrowUp') {
		if ( pastIndex == -1 )tempcmd = String(cmdin.value)
		cmdrecent(true)
	}
	else if (e.key == 'ArrowDown') {
		cmdrecent(false)
	}
})




var _readFileText=function(input,callback){
	var len=input.files.length,_files=[],res=[], names=[]
	var readFile=function(filePos){
		if(!filePos){
			callback(false,res);
		}else{
			var reader=new FileReader();
			reader.onload=function(e){              
				res.push({text: e.target.result, name: names[res.length]});
				readFile(_files.shift());
			};
			//reader.readAsDataURL(filePos);
			reader.readAsText(filePos)
			names.push(filePos.name)
		}
	};
	for(var x=0;x<len;x++){
		_files.push(input.files[x]);
	}
	readFile(_files.shift());
}



const upload = (file, path) => {
  fetch(location.origin+'/api/write?path='+path, { // Your POST endpoint
    method: 'POST',
    headers: {
      //"Content-Type": "You will perhaps need to define a content-type here"
    },
    body: file // This is your file object
  })
  .then(response => {
	  listFiles()
  })/*.then(
    response => console.info(response) //response.json() // if the response is a JSON object
  ).then(
    success => console.log(success) // Handle the success response object
  ).catch(
    error => console.log(error) // Handle the error response object
  );*/
};



function createFileButtonHandler () {
	let checked = document.getElementById('FileCreateSwitch').checked
	let type = checked ? 'file' : 'dir'
	let name = document.getElementById('newFileNameBox').value
	if (name == '') return;
	httpGetAsync(location.origin+'/api/create/'+type+'?path='+PATH+'/'+name, function (ret) {
		listFiles()
	})
}





document.getElementsByName('fileUploadInput')[0].addEventListener('change', function (e) {
	_readFileText(this,function(err,files){
           if(err){return}
		   for (file of files) {
			   upload(file.text, PATH+'/'+file.name)
		   }
     });
	
})

/*
document.getElementById('deleteButton').addEventListener('click', function () {
	
	
	
})
*/

resetPath()
//listFiles()