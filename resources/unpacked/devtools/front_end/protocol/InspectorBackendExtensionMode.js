Protocol.InspectorBackendExtensionMode = {};

Protocol.InspectorBackendExtensionMode.loadFromExtensionIfNeeded = function() {
  if (Protocol.inspectorBackend && Protocol.inspectorBackend.isInitialized()) {
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

  const backendAPI = window.localStorage.getItem('dirac_backend_api'); // see handshake.js
  if (backendAPI) {
    const lines = backendAPI.split("\n").filter(s => s.length);
    Protocol.BakedInspectorBackendMode = "external";
    Protocol.BakedInspectorBackendModeInfo = lines.length;
    if (dirac._DEBUG_BACKEND_API) {
      console.log("BackendAPI: backend_api url parameter present (" + Protocol.BakedInspectorBackendModeInfo + ").");
    }
    evalAPI(lines);
  } else {
    const lines = Protocol.BakedInspectorBackendAPI.split("\n").filter(s => s.length);
    Protocol.BakedInspectorBackendMode = "internal";
    Protocol.BakedInspectorBackendModeInfo = lines.length;
    if (dirac._DEBUG_BACKEND_API) {
      console.log("BackendAPI: backend_api url parameter not present. Using pre-baked backend API (" + Protocol.BakedInspectorBackendModeInfo + ").");
    }
    evalAPI(lines);
  }
};

Protocol.InspectorBackendExtensionMode.loadFromExtensionIfNeeded();
