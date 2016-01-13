# Dirac

Dirac is a DevTools fork with extra features to aid development in ClojureScript.

Dirac depends on [cljs-devtools](https://github.com/binaryage/cljs-devtools).

![REPL](https://dl.dropboxusercontent.com/u/559047/dirac-teaser.png)

![Source Panel Enhancements](https://dl.dropboxusercontent.com/u/559047/dirac-source-panel-enhancements.png)

#### Features

  * REPL integrated into DevTools Javascript console
    * eval ClojureScript in the context of activated breakpoint
    * [Parinfer](https://shaunlebron.github.io/parinfer) goodness
  * custom formatters enabled by default (for [cljs-devtools](https://github.com/binaryage/cljs-devtools))
  * inlined custom formatters in source code during debugging
  * friendly display of ClojureScript properties in 'Object Properties' panels
    * macro-generated names are renamed to friendly names using sub-indexes
    * properties are grouped into clusters, the most important properties at the top
      * properties with nice names go first
      * then macro-generated names
      * then null values
      * then undefined values

#### A divergent fork?

Dirac changes are too specific for ClojureScript. I don't have an ambition to merge this project upstream into official
DevTools. Instead the idea is to maintain a set of patches rolling on top of official DevTools branch.

It is not that big deal at the end of the day. I provide [Dirac Chrome Extension](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi)
which wraps Dirac to make installation and life a bit easier for Dirac users.
Please note that you should always use the latest Chrome Canary with Dirac DevTools to prevent any compatibility issues.

#### A demo time!

Launch latest Chrome Canary from command-line. I want you to install the [Dirac Chrome Extension](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi) there,
so it is recommended to run it with a dedicated user profile:

    mkdir demo-workspace
    cd demo-workspace
    mkdir .dirac-chrome-profile

Also you have to run it with [remote debugging](https://developer.chrome.com/devtools/docs/debugger-protocol)
enabled on port 9222 (better make an alias of this command):

    /Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary --remote-debugging-port=9222 --no-first-run --user-data-dir=.dirac-chrome-profile

Now you can install [Dirac DevTools Chrome extension](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi).
After installation, should see a new extension icon next to your address bar.

Now you should clone [cljs-devtools-sample](https://github.com/binaryage/cljs-devtools-sample) and test it with Dirac DevTools:

    cd demo-workspace
    git clone https://github.com/binaryage/cljs-devtools-sample.git
    cd cljs-devtools-sample
    lein dirac

At this point you should have a demo website running at [http://localhost:7000](http://localhost:7000).

Clicking on Dirac extension icon while on the `localhost:7000` page should open you a new window with Dirac DevTools app.
It will look almost the same as stock DevTools, but you can tell the difference at first glance: active tab highlight
will be green instead of blue (see the screenshots above).

Ok, now you can switch to Javascript Console in Dirac DevTools. Focus prompt field and press `PageUp` or `PageDown`.
This will switch prompt from Javascript REPL to ClojureScript REPL.

You should see a red message on a green background: `Dirac Agent is disconnected. Check your nREPL tunnel at ws://localhost:8231.`

That's correct. Dirac REPL uses nREPL protocol, so we have to provide it with some nREPL server.
Luckily enough leiningen offers nREPL server by simply running:

    lein repl

After your nREPL starts your Dirac DevTools should eventually reconnect. Or close Dirac window and open it again if
you don't want to wait for reconnection countdown.

Connected? The red message should go away and you should see `cljs.user` indicating your current namespace instead.
REPL is ready for your input at this point. You can try:

    (+ 1 2)
    js/window
    (doc filter)
    (filter odd? (range 42))

Congratulations!

##### Installation

TODO: here I will explain detailed info about full installation and configuration.

### Credits

* [Antonin Hildebrand](https://github.com/darwin) - [cljs-devtools](https://github.com/binaryage/cljs-devtools), [chromex](https://github.com/binaryage/chromex)
* [Shaun LeBron](https://github.com/shaunlebron) - [parinfer](https://github.com/shaunlebron/parinfer)

---

#### License [MIT](license.txt)