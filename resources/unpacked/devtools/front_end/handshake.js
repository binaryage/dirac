// The goal of handshake is to pass backend_api and backend_css from extension into frontend.
// This info is needed early during frontend initialization, but we don't have sync apis to
// communicate between extension and frontend so we have to pass this via url params.
// Unfortunately, these parameters can be pretty long and this would obfuscate url params visible from
// chrome://extensions and cause other usability issues (for example refreshing frontend via hitting enter in omnibox
// would fail).
//
// We work around these issues by opening this handshake.html first and passing it these ugly url params.
// Here we store the data into localStorage and let frontend read it later.
// See Protocol.InspectorBackendExtensionMode and SDK.SupportedCSSPropertiesExtensionMode for further details.

const params = new URL(document.location.href).searchParams; // http://stackoverflow.com/a/12151322/84283

const encodedBackendAPI = params.get("backend_api");
if (encodedBackendAPI) {
  const backendAPI = decodeURIComponent(encodedBackendAPI);
  localStorage.setItem('dirac_backend_api', backendAPI);
}

const encodedBackendCSS = params.get("backend_css");
if (encodedBackendCSS) {
  const backendCSS = decodeURIComponent(encodedBackendCSS);
  localStorage.setItem('dirac_backend_css', backendCSS);
}

// this is here to signal our extension that we are done with our work,
// cannot easily inject script myself: https://bugs.chromium.org/p/chromium/issues/detail?id=30756
document.title = "#";
