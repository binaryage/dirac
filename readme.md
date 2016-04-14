# Dirac [![GitHub license](https://img.shields.io/github/license/binaryage/dirac.svg)](license.txt) [![Clojars Project](https://img.shields.io/clojars/v/binaryage/dirac.svg)](https://clojars.org/binaryage/dirac) [![Travis](https://img.shields.io/travis/binaryage/dirac.svg)](https://travis-ci.org/binaryage/dirac)

Dirac is a [Chrome DevTools](https://developer.chrome.com/devtools) fork with extra features to aid development in ClojureScript.

#### Features

  * REPL integrated into DevTools Javascript console
    * eval ClojureScript in the context of currently selected stack frame (activated breakpoint)
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

![ClojureScript REPL](https://dl.dropboxusercontent.com/u/559047/dirac-repl-01.png)

![Source Panel Enhancements](https://dl.dropboxusercontent.com/u/559047/dirac-source-01.png)

#### A demo time!

Launch latest Chrome Canary from command-line. I will want you to install the [Dirac Chrome Extension](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi) there,
so I recommend to run it with a dedicated user profile:

    mkdir demo-workspace
    cd demo-workspace
    mkdir .dirac-chrome-profile

Also you have to run it with [remote debugging](https://developer.chrome.com/devtools/docs/debugger-protocol)
enabled on port 9222 (better make an alias of this command):

    /Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary \
      --remote-debugging-port=9222 \
      --no-first-run \
      --user-data-dir=.dirac-chrome-profile

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
This will switch prompt from Javascript REPL to ClojureScript REPL. (Note you might need to refresh the page once to see
custom formatters - DevTools do not render them first time for some reason).

You should see a red message on a green background: `Dirac Agent is disconnected. Check your nREPL tunnel at ws://localhost:8231.`

That's correct. Dirac REPL uses nREPL protocol, so we have to provide it with some nREPL server.
Luckily enough leiningen offers nREPL server by simply running:

    cd demo-workspace/cljs-devtools-sample
    lein repl

After your nREPL starts your Dirac DevTools should eventually reconnect. Or close Dirac window and open it again if
you don't want to wait for reconnection countdown.

Connected? The red message should go away and you should see `cljs.user` indicating your current namespace instead.
REPL is ready for your input at this point. You can try:

    (+ 1 2)
    js/window
    (doc filter)
    (filter odd? (range 42))
    (in-ns)
    (in-ns 'my.ns)

If you see something very similar to the first screenshot at the top, you have Dirac running properly. **Congratulations!**

You can also test evaluation of ClojureScript in the context of selected stack frame when paused on a breakpoint:

1. set breakpoint to line 40 of `more.cljs` (on Mac, you can use use CMD+P to quickly open a file at source panel)
2. click the "breakpoint test" button on the page
3. debugger should pause on the line (similar to the second screenshot at the top)

You could notice that custom formatters are presented everywhere including inlined values in the source code.
Also property names in the scope panel are sorted and displayed in a more friendly way.

Now hit ESC to bring up console drawer. Make sure you are switched to Dirac REPL and then enter:

    js/rng

You should see actual value of `rng` variable from local scope (formatted by custom formatters from cljs-devtools).
Same way as you would expect when evaluating a Javascript command. Actually you can try it.
Hit "Page Up" to switch to Javascript console prompt and enter:

    rng

This should return the same value.

And now return back to Dirac REPL by pressing "Page Up" again and enter:

    (take 3 js/rng)

This is a proof that Dirac REPL can execute arbitrary ClojureScript code in the context of selected stack frame.

### Credits

* [Antonin Hildebrand](https://github.com/darwin) - [cljs-devtools](https://github.com/binaryage/cljs-devtools), [chromex](https://github.com/binaryage/chromex)
* [Shaun LeBron](https://github.com/shaunlebron) - [parinfer](https://github.com/shaunlebron/parinfer)