// install uncaught exception handlers for more descriptive errors in console logs (as retrieved by chromedriver)

function presentError(err, e) {
    console.error("Uncaught in Dirac test runner: " + err + "\n" + e.stack);
}

function browserErrorHandler(event) {
    const error = event ? event.error : undefined;
    presentError(error, event);
}

function browserRejectionHandler(event) {
    const error = event ? event.reason : undefined;
    presentError(error, event);
}

function installErrorHandlers() {
    window.addEventListener('error', browserErrorHandler);
    window.addEventListener('unhandledrejection', browserRejectionHandler);
}

installErrorHandlers();

/////////////////////////////////////////////////////////////////////////////////////////////////////////////

// quick and dirty, from http://stackoverflow.com/a/901144/84283
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    url = url.toLowerCase(); // This is just to avoid case sensitiveness
    name = name.replace(/[\[\]]/g, "\\$&").toLowerCase();// This is just to avoid case sensitiveness for query parameter name
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function displayTaskName(task) {
    const nameEl = document.getElementById("task-name");
    if (nameEl) {
        nameEl.innerText = task;
    }
}

function taskNamespaceToJavascriptNamespace(taskNs) {
    return taskNs.replace(/-/g, "_");
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

goog.require("dirac.automation.runner");

const taskRootNamespace = "dirac.tests.tasks";
const task = getParameterByName("task");
if (!task) {
    const msg = "Please specify task parameter in the url. e.g. http://localhost:9080/suite01/resources/runner.html?task=open-close-dirac.";
    console.error(msg);
    document.body.innerHTML = msg;
} else {
    const ns = taskRootNamespace + "." + taskNamespaceToJavascriptNamespace(task);
    console.info("loading task namespace '" + ns + "'");
    goog.require(ns);
    displayTaskName(task);
}
