# Dirac Chrome Extension

In general there are two ways how to use custom version of DevTools:

1. Host it as a normal web app and let it connect to Chrome via [debugger protocol](https://chromedevtools.github.io/devtools-protocol), let's call this `hosted mode`.
2. Launch Chrome with a flag `--custom-devtools-frontend=/path/to/your/devtools`, let's call this `internal mode`.

The internal mode preferable because the hosted mode has some limitations:  

1. internal DevTools run with some elevated privileges (some hosted mode functionality might [not be available](https://github.com/binaryage/dirac/issues/80))
2. internal DevTools are better integrated: 
    1. opens with familiar keyboard shortcuts, etc.
    2. docks withing main Chrome window

When I started Dirac project the internal mode was not possible and that is why I implemented Dirac DevTools as a hosted 
web app in Chrome Extension. Recently I decided to bite the bullet and finally to take advantage of the internal mode option.

Since [version 1.5.0](https://github.com/binaryage/dirac/releases/tag/v1.5.0) Dirac Chrome Extension is not needed anymore.
You should be using [Dirac CLI tool](main.md) to launch Chrome.  

This page documents the old hosted mode workflow which will be supported for some time but I will remove it eventually.    

#### Setup Dirac Chrome Extension

Please note that [you should always use the latest Chrome Canary](faq.md#why-should-i-use-recent-chrome-canary-with-dirac-devtools) 
with Dirac DevTools to prevent any compatibility issues.

You probably want to run your Chrome Canary with dedicated user profile. And you have to run it with 
[remote debugging](https://developer.chrome.com/devtools/docs/debugger-protocol) enabled.

    /Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary \
      --remote-debugging-port=9222 \
      --no-first-run \
      --user-data-dir=~/.dirac/chromium/profiles/extension

Please note that `--remote-debugging-port` should be 9222 by default. But you can change it in the Dirac Extension 
`options page` if needed.

Now install the [Dirac Chrome Extension](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi). 
Chrome should keep it up-to-date for you.
