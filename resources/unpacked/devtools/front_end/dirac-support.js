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

window.dirac = {
  hasFeature: hasFeature,
  hasREPL: hasFeature("enable-repl"),
  hasParinfer: hasFeature("enable-parinfer"),
  hasFriendlyLocals: hasFeature("enable-friendly-locals"),
  hasClusteredLocals: hasFeature("enable-clustered-locals"),
  hasInlineCFs: hasFeature("inline-custom-formatters")
};

})();