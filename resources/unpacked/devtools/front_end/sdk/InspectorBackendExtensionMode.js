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
        const lines = decodedBackendAPI.split("\n");
        if (dirac._DEBUG_BACKEND_API) {
            console.log("BackendAPI: backend_api url parameter present (" + lines.length + " registrations).");
        }
        evalAPI(lines);
        WebInspector.BakedInspectorBackendMode = "external";
    } else {
        const lines = WebInspector.BakedInspectorBackendAPI.split("\n");
        if (dirac._DEBUG_BACKEND_API) {
            console.log("BackendAPI: backend_api url parameter not present. Using pre-baked backend API (" + lines.length + " registrations).");
        }
        evalAPI(lines);
        WebInspector.BakedInspectorBackendMode = "internal";
    }
};

WebInspector.InspectorBackendExtensionMode.loadFromExtensionIfNeeded();
