let httpError = false;

function httpGetAsync(theUrl, callback)
{

    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4) {
          if (callback==null) {return;}

          callback(xmlHttp.responseText);
        }
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous
    xmlHttp.send('test');
    xmlHttp.onerror = function() {
      connected = false;
      if (!httpError) {alert('An unexpected connection error occured, the server might\'ve crashed.');}
      httpError = true;
    }
}

function connect(callback,name) {
  httpGetAsync(location.origin+"/api/connect?Name="+name,callback);
}

function ping(callback) {
  httpGetAsync(location.origin+"/api/ping",callback);
}

function disconnect(callback) {
  httpGetAsync(location.origin+"/api/disconnect",callback);
}

function isConnected(callback) {
  httpGetAsync(location.origin+"/api/isconnected",callback);
}


function getDir(callback,path2) {
  httpGetAsync(location.origin+"/api/dir?Path="+path2,callback);
}

function getCwd(callback) {
  httpGetAsync(location.origin+"/api/cwd",callback);
}
