WebInspector.SupportedCSSPropertiesExtensionMode = {};

WebInspector.SupportedCSSPropertiesExtensionMode.loadFromExtensionIfNeeded = function() {
    const evalCSS = (definitions) => {
        try {
            eval("WebInspector.CSSMetadata._generatedProperties = " + definitions);
        } catch (e) {
            throw new Error("BackendCSS: unable to eval CSS" + e);
        }
    };

    const encodedBackendCSS = Runtime.queryParam("backend_css");
    if (encodedBackendCSS) {
        const backendCSS = decodeURIComponent(encodedBackendCSS);
        const lines = backendCSS.split("\n");
        if (dirac._DEBUG_BACKEND_CSS) {
            console.log("BackendCSS: backend_css url parameter present (" + lines.length + " definitions).");
        }
        evalCSS(backendCSS);
        WebInspector.BakedSupportedCSSPropertiesMode = "external";
    } else {
        const backendCSS = WebInspector.BakedSupportedCSSProperties;
        const lines = backendCSS.split("\n");
        if (dirac._DEBUG_BACKEND_CSS) {
            console.log("BackendCSS: backend_css url parameter not present. Using pre-baked backend CSS (" + lines.length + " definitions).");
        }
        evalCSS(backendCSS);
        WebInspector.BakedSupportedCSSPropertiesMode = "internal";
    }
};

WebInspector.SupportedCSSPropertiesExtensionMode.loadFromExtensionIfNeeded();
