(function() {

var featureFlags = {};

var knownFeatureFlags = [
  "enable-repl",
  "enable-parinfer",
  "enable-friendly-locals",
  "enable-clustered-locals",
  "inline-custom-formatters"];

function featureToIndex(feature) {
  return knownFeatureFlags.indexOf(feature);
}

function hasFeature(feature) {
  var flag = featureFlags[feature];
  if (flag !== undefined) {
    return flag;
  }
  var featureIndex = knownFeatureFlags.indexOf(feature);
  if (featureIndex === -1) {
    return true;
  }
  var activeFlags = Runtime.queryParam("dirac_flags") || "";
  var result = activeFlags[featureIndex] !== '0';
  featureFlags[feature] = result;
  return result;
}

// taken from https://github.com/joliss/js-string-escape/blob/master/index.js
function stringEscape(string) {
  return ('' + string).replace(/["'\\\n\r\u2028\u2029]/g, function (character) {
    // Escape all characters not included in SingleStringCharacters and
    // DoubleStringCharacters on
    // http://www.ecma-international.org/ecma-262/5.1/#sec-7.8.4
    switch (character) {
      case '"':
      case "'":
      case '\\':
        return '\\' + character
      // Four possible LineTerminator characters need to be escaped:
      case '\n':
        return '\\n'
      case '\r':
        return '\\r'
      case '\u2028':
        return '\\u2028'
      case '\u2029':
        return '\\u2029'
    }
  })
}

function codeAsString(code) {
  return "'" + stringEscape(code) + "'";
}

function evalInCurrentContext(code, callback) {
  var currentExecutionContext = WebInspector.context.flavor(WebInspector.ExecutionContext);
  if (currentExecutionContext) {
    var result = function(result, wasThrown, valueResult, exceptionDetails) {
      if (wasThrown) {
        console.error("evalInCurrentContext: ", exceptionDetails);
      }
      if (callback) {
        callback(result, wasThrown, valueResult, exceptionDetails);
      }
    };

    currentExecutionContext.evaluate(code, "console", false, false, false, true, result);
  }
}

window.dirac = {
  hasFeature: hasFeature,
  hasREPL: hasFeature("enable-repl"),
  hasParinfer: hasFeature("enable-parinfer"),
  hasFriendlyLocals: hasFeature("enable-friendly-locals"),
  hasClusteredLocals: hasFeature("enable-clustered-locals"),
  hasInlineCFs: hasFeature("inline-custom-formatters"),
  codeAsString: codeAsString,
  stringEscape: stringEscape,
  evalInCurrentContext: evalInCurrentContext
};

})();