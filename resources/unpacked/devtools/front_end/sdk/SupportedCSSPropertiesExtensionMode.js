SDK.SupportedCSSPropertiesExtensionMode = {};

SDK.SupportedCSSPropertiesExtensionMode.loadFromExtensionIfNeeded = function() {
  const evalCSS = (definitions) => {
    try {
      eval("SDK.CSSMetadata._generatedProperties = " + definitions);
    } catch (e) {
      throw new Error("BackendCSS: unable to eval CSS" + e);
    }
  };

  const hasBackendCSS = Runtime.queryParam("backend_css");
  if (hasBackendCSS) {
    const backendCSS = window.localStorage.getItem('dirac_backend_css'); // see handshake.js
    const lines = backendCSS.split("\n").filter(s => s.length);
    Protocol.BakedSupportedCSSPropertiesMode = "external";
    Protocol.BakedSupportedCSSPropertiesModeInfo = lines.length;
    if (dirac._DEBUG_BACKEND_CSS) {
      console.log("BackendCSS: backend_css url parameter present (" + Protocol.BakedSupportedCSSPropertiesModeInfo + ").");
    }
    evalCSS(backendCSS);
  } else {
    const backendCSS = Protocol.BakedSupportedCSSProperties;
    const lines = backendCSS.split("\n").filter(s => s.length);
    Protocol.BakedSupportedCSSPropertiesMode = "internal";
    Protocol.BakedSupportedCSSPropertiesModeInfo = lines.length;
    if (dirac._DEBUG_BACKEND_CSS) {
      console.log("BackendCSS: backend_css url parameter not present. Using pre-baked backend CSS (" + Protocol.BakedSupportedCSSPropertiesModeInfo + ").");
    }
    evalCSS(backendCSS);
  }
};

SDK.SupportedCSSPropertiesExtensionMode.loadFromExtensionIfNeeded();
