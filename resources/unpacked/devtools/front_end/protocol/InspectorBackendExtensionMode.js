Protocol.InspectorBackendExtensionMode = {};

Protocol.InspectorBackendExtensionMode.loadFromExtensionIfNeeded = function() {
  if (Protocol.inspectorBackend && Protocol.inspectorBackend.isInitialized()) {
    return;
  }

  const evalAPI = (lines) => {
    let lineNum = 0;
    for (let line of lines) {
      lineNum += 1;
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
    evalAPI(lines);
  } else if (Protocol.BakedInspectorBackendAPI) {
    const lines = Protocol.BakedInspectorBackendAPI.split("\n").filter(s => s.length);
    Protocol.BakedInspectorBackendMode = "internal";
    Protocol.BakedInspectorBackendModeInfo = lines.length;
    evalAPI(lines);
  } else {
    Protocol.BakedInspectorBackendMode = "embedded";
    Protocol.BakedInspectorBackendModeInfo = "";
  }
};

Protocol.InspectorBackendExtensionMode.loadFromExtensionIfNeeded();
