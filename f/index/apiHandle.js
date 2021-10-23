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
      if (!httpError) {alert('An unexpected error occurred! Our server may have crashed.');}
      httpError = true;
    }
}


function ping(callback) {
  httpGetAsync(location.origin+"/api/ping",callback);
}



function isConnected(callback) {
  httpGetAsync(location.origin+"/api/isconnected",callback);
}


function getDir(callback,path) {
  httpGetAsync(location.origin+"/api/getfiles?path="+path,callback);
}

function getCwd(callback) {
  httpGetAsync(location.origin+"/api/cwd",callback);
}
