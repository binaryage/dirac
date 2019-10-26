// use goog.debugLoader_.dependencies_ to list all relevant task namespaces
// we rely on the fact that we are running unoptimized clojurescript code here
// so all namespaces are present with original names

function getIndex(re) {
  const index = [];
  const deps = goog.debugLoader_.dependencies_;
  for (const item in deps) {
    if (deps.hasOwnProperty(item)) {
      const dep = deps[item];
      const firstNs = dep.provides[0];
      if (firstNs) {
        const m = firstNs.match(re);
        if (m) {
          index.push(m[1]);
        }
      }
    }
  }
  return index;
}

function getCurrentUrlQuery() {
  return window.location.search.replace("?", "");
}

function genTaskList(runnerUrl, tasks) {
  const lines = [
    "<div class='tasks'>",
    "<span class='tasks-title'>AVAILABLE TASKS:</span>",
    "<ol class='suite-list'>"];

  let lastPrefix = null;

  let query = getCurrentUrlQuery();
  if (query) {
    query = "&" + query;
  }

  for (let i = 0; i < tasks.length; i++) {
    const ns = tasks[i];
    const parts = ns.split(".");
    const lastPart = parts.pop();
    const prefix = parts.join(".");

    if (prefix.match(/^suite/)) { // we want to skip some internal tasks like those under helpers prefix
      if (prefix !== lastPrefix) {
        if (lastPrefix) {
          lines.push("</ol>");
          lines.push("</li>");
        }
        lastPrefix = prefix;
        lines.push("<li>");
        lines.push("<span class='suite-title'>" + prefix + "</span>");
        lines.push("<ol class='task-list'>");
      }

      const line = "<li><a href=\"" + runnerUrl + "?task=" + ns + query + "\">" + lastPart + "</a></li>";
      lines.push(line);
    }
  }

  lines.push("</ol>");
  lines.push("</li>");
  lines.push("</ol>");
  lines.push("</div>");
  return lines.join("\n");
}

function httpGetAsync(theUrl, callback) {
  const xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function () {
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
      callback(xmlHttp.responseText);
  };
  xmlHttp.open("GET", theUrl, true); // true for asynchronous
  xmlHttp.send(null);
}

function genScenariosMarkup(runnerUrl, url) {
  const lines = ["<div class='scenarios'>",
    "<span class='scenarios-title'>AVAILABLE SCENARIOS:</span>",
    "<ol class='scenarios-list' id='scenarios-list'>",
    "</ol>",
    "</div>"];

  let query = getCurrentUrlQuery();
  if (query) {
    query = "&" + query;
  }

  httpGetAsync(url, function (content) {
    const lines = [];
    const re = /<a href="(.*?)\.html">.*?<\/a>/gm;
    let m;
    while (m = re.exec(content)) {
      const scenarioName = m[1];
      lines.push("<li><a href=\"" + runnerUrl + "?task=helpers.open-scenario" + query + "&scenario=" + scenarioName + "\">" + scenarioName + "</a></li>");
    }
    const listEl = document.getElementById("scenarios-list");
    listEl.innerHTML = lines.join("\n");
  });

  return lines.join("\n");
}

const tasks = getIndex(/dirac\.tests\.tasks\.(.*)/);
const tasksMarkup = genTaskList("runner.html", tasks.sort());
const scenariosMarkup = genScenariosMarkup("runner.html", "scenarios");

document.body.innerHTML = [tasksMarkup, scenariosMarkup].join("<br>");
