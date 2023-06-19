document.querySelectorAll('.url_insert').forEach(url_insert);
function url_insert(el) {
  var url = el.dataset.url;
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
    	el.innerHTML = this.response;
    }
  };
  xhttp.open("GET", url, true);
  xhttp.send();
}
