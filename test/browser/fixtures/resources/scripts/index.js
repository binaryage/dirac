// use goog.dependencies_ to list all relevant task namespaces
// we rely on the fact that we are running unoptimized clojurescript code here
// so all namespaces are present with original names

function pathToNamespace(path) {
    return path.replace(/_/g, "-").replace(/\//g, ".");
}

function getIndex(re) {
    var index = [];
    var container = goog.dependencies_.requires;
    for (var item in container) {
        if (container.hasOwnProperty(item)) {
            var m = item.match(re);
            if (m) {
                var path = m[1];
                index.push(pathToNamespace(path));
            }
        }
    }
    return index;
}

function getCurrentUrlQuery() {
    return window.location.search.replace("?", "");
}

function genTaskList(runnerUrl, tasks) {
    var lines = [
        "<div class='tasks'>",
        "<span class='tasks-title'>AVAILABLE TASKS:</span>",
        "<ol class='suite-list'>"];

    var lastPrefix = null;

    for (var i = 0; i < tasks.length; i++) {
        var ns = tasks[i];
        var parts = ns.split(".");
        var lastPart = parts.pop();
        var prefix = parts.join(".");

        if (prefix != lastPrefix) {
            if (lastPrefix) {
                lines.push("</ol>");
                lines.push("</li>");
            }
            lastPrefix = prefix;
            lines.push("<li>");
            lines.push("<span class='suite-title'>" + prefix + "</span>");
            lines.push("<ol class='task-list'>");
        }

        let query = getCurrentUrlQuery();
        if (query) {
            query = "&" + query;
        }
        var line = "<li><a href=\"" + runnerUrl + "?task=" + ns + query + "\">" + lastPart + "</a></li>";
        lines.push(line);
    }

    lines.push("</ol>");
    lines.push("</li>");
    lines.push("</ol>");
    lines.push("</div>");
    return lines.join("\n");
}

function httpGetAsync(theUrl, callback) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    };
    xmlHttp.open("GET", theUrl, true); // true for asynchronous
    xmlHttp.send(null);
}

function genScenariosMarkup(url) {
    const lines = ["<div class='scenarios'>",
        "<span class='scenarios-title'>AVAILABLE SCENARIOS:</span>",
        "<ol class='scenarios-list' id='scenarios-list'>",
        "</ol>",
        "</div>"];

    httpGetAsync(url, function(content) {
        const lines = [];
        var re = /(<a.*?\/a>)/gm;
        var m;
        while (m = re.exec(content)) {
            const link = m[1];
            const patchedLink = link.replace("href=\"", "href=\"" + url + "/");
            lines.push("<li>" + patchedLink +"</li>");
        }
        const listEl = document.getElementById("scenarios-list");
        listEl.innerHTML = lines.join("\n");
    });

    return lines.join("\n");
}

var tasks = getIndex(/tasks\/(.*)\.js/);
var tasksMarkup = genTaskList("runner.html", tasks.sort());
var scenariosMarkup = genScenariosMarkup("scenarios");

document.body.innerHTML = [tasksMarkup, scenariosMarkup].join("<br>");
