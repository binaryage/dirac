// use goog.dependencies_ to list all relevant task namespaces
// we rely on the fact that we are running unoptimized clojurescript code here
// so all namespaces are present with original names

function getIndex(re) {
  var index = [];
  var container = goog.dependencies_.requires;
  for (var item in container) {
    if (container.hasOwnProperty(item)) {
      var m = item.match(re);
      if (m) {
        var ns = m[1];
        var demunged = ns.replace(/_/g, "-");
        index.push(demunged);
      }
    }
  }
  return index;
}

function genList(runnerUrl, index) {
  var lines = ["<b>AVAILABLE TASKS:</b><ul>"];

  for (var i=0; i<index.length; i++) {
    var ns = index[i];
    var line = "<li><a href=\""+ runnerUrl +"?task="+ ns +"\">"+ns+"</a></li>";
    lines.push(line);
  }
  lines.push("</ul>");
  return lines.join("");
}

var index = getIndex(/suite01\/([^/]*)\.js/);
var markup = genList("/suite01/resources/runner.html", index);

document.body.innerHTML = markup;