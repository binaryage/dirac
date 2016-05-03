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

### Why can't I dock Dirac DevTools inside my Chrome window?

This isn't possible, due to limitations in the Chrome API's. The docking API is only available for the embedded (internal) devtools that come with Chrome. See [#5](https://github.com/binaryage/dirac/issues/5) for more details.
