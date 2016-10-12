WebInspector.InspectorBackendExtensionMode = {};

WebInspector.InspectorBackendExtensionMode.loadFromExtensionIfNeeded = function() {
    if (InspectorBackend.isInitialized()) {
        return;
    }

    const evalAPI = (lines) => {
        let lineNum = 0;
        for (let line of lines) {
            lineNum += 1;
            if (dirac._DEBUG_BACKEND_API) {
                console.log("BackendAPI: (eval) ", line);
            }
            try {
                eval(line);
            } catch (e) {
                throw new Error("BackendAPI: unable to eval API at line #" + lineNum + ":\n" + "  " + line + "\n" + e);
            }
        }
    };

    const backendAPI = Runtime.queryParam("backend_api");
    if (backendAPI) {
        const decodedBackendAPI = decodeURIComponent(backendAPI);
        const lines = decodedBackendAPI.split("\n").filter(s => s.length);
        WebInspector.BakedInspectorBackendMode = "external";
        WebInspector.BakedInspectorBackendModeInfo = lines.length;
        if (dirac._DEBUG_BACKEND_API) {
            console.log("BackendAPI: backend_api url parameter present (" + WebInspector.BakedInspectorBackendModeInfo + ").");
        }
        evalAPI(lines);
    } else {
        const lines = WebInspector.BakedInspectorBackendAPI.split("\n").filter(s => s.length);
        WebInspector.BakedInspectorBackendMode = "internal";
        WebInspector.BakedInspectorBackendModeInfo = lines.length;
        if (dirac._DEBUG_BACKEND_API) {
            console.log("BackendAPI: backend_api url parameter not present. Using pre-baked backend API (" + WebInspector.BakedInspectorBackendModeInfo + ").");
        }
        evalAPI(lines);
    }
};

WebInspector.InspectorBackendExtensionMode.loadFromExtensionIfNeeded();
