SDK.SupportedCSSPropertiesExtensionMode = {};

SDK.SupportedCSSPropertiesExtensionMode.loadFromExtensionIfNeeded = function() {
  const evalCSS = (definitions) => {
    try {
      eval("SDK.CSSMetadata._generatedProperties = " + definitions);
    } catch (e) {
      throw new Error("BackendCSS: unable to eval CSS" + e);
    }
  };

  const backendCSS = window.localStorage.getItem('dirac_backend_css'); // see handshake.js
  if (backendCSS) {
    const lines = backendCSS.split("\n").filter(s => s.length);
    Protocol.BakedSupportedCSSPropertiesMode = "external";
    Protocol.BakedSupportedCSSPropertiesModeInfo = lines.length;
    evalCSS(backendCSS);
  } else if (Protocol.BakedSupportedCSSProperties) {
    const backendCSS = Protocol.BakedSupportedCSSProperties;
    const lines = backendCSS.split("\n").filter(s => s.length);
    Protocol.BakedSupportedCSSPropertiesMode = "internal";
    Protocol.BakedSupportedCSSPropertiesModeInfo = lines.length;
    evalCSS(backendCSS);
  } else {
    Protocol.BakedSupportedCSSPropertiesMode = "embedded";
    Protocol.BakedSupportedCSSPropertiesModeInfo = "";
  }
};

SDK.SupportedCSSPropertiesExtensionMode.loadFromExtensionIfNeeded();
