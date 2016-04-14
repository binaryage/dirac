# Dirac DevTools FAQ

### Why should I use recent Chrome Canary with Dirac DevTools?

DevTools "frontend" depends on Chrome APIs on the "backend" ([remote debugging protocol](https://developer.chrome.com/devtools/docs/debugger-protocol) and others).
As you can imagine those APIs are in constant evolution. This is normally not a problem because internal DevTools frontend bundled with Chrome talks to a matching backend.

But if you use your own version of DevTools frontend and connect it to an arbitrary Chrome (backend) better that Chrome be of similar "age".
It might work but it is not guaranteed. Typically a new DevTools-related backend API is introduced in a next Chrome version and DevTools frontend adopts it at some point later.
DevTools developers have some system in place which allows detection of available APIs. This allows for some flexibility so DevTools
frontend doesn't break when used with a slightly different Chrome version. But you should not use "too old" DevTools with "too recent" Chrome and vice versa.
Such combinations are not tested and are likely to break because fundamental APIs could be missing / changed on either side.

My goal is to release Dirac DevTools update at least once a month to match it with current Chrome Canary builds.