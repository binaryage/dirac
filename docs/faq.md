# Dirac DevTools FAQ

### Why should I use recent Chrome Canary with Dirac DevTools?

Please note that DevTools has two parts.

1. DevTools "frontend" is a single-page web application (this is the UI you can see)
2. DevTools "backend" is a set of APIs in Chrome providing various services to the DevTools frontend over a websocket connection (see [remote debugging protocol](https://developer.chrome.com/devtools/docs/debugger-protocol)).

As you can imagine those APIs are in constant evolution. This is normally not a problem because internal DevTools frontend is bundled with Chrome so it is guaranteed that it talks to a matching backend.

When you use your own version of DevTools frontend and connect it to an arbitrary Chrome (backend) better make sure that the Chrome is of similar "age".
It might work but it is not guaranteed. DevTools developers have some anti-fragility system in place which allows detection of available APIs, so that
DevTools frontend can adapt dynamically and does not fatally break when used with a slightly different Chrome version.
But you should not use "too old" DevTools with "too recent" Chrome and vice versa.
Such combinations are not tested and are likely to break because fundamental APIs could be missing / changed on either side.

My goal is to be releasing Dirac DevTools updates at least once a month to match it with recent Chrome Canary builds.

### How do I open Dirac DevTools via a keyboard shortcut?

By default, `CMD+SHIFT+I` under Mac and `CTRL+SHIFT+I` under Win.
You can assign a new shortcut via `chrome://extensions` -> `Keyboard shortcuts`

### How do I focus Dirac REPL prompt via a keyboard shortcut?

It is handy to bind a global keyboard shortcut to focus your Dirac REPL.
You must do this manually via `chrome://extensions` -> `Keyboard shortcuts` due to Chrome security reasons.
Ideally (with multi-monitor setup) your always-present Dirac REPL session will be just one keystroke away
from your code editor or any other app.

This is my setup under Mac, note the "Global" selection for "Focus Console Prompt":
<a href="https://dl.dropboxusercontent.com/u/559047/dirac-global-shortcuts.png"><img src="https://dl.dropboxusercontent.com/u/559047/dirac-global-shortcuts.png" width="800px"></a>

### Why can't I dock Dirac DevTools inside my Chrome window?

The docking API is only available for the embedded (internal) DevTools that come with Chrome.
See [the issue #5](https://github.com/binaryage/dirac/issues/5) for more details.
