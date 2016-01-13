# Dirac

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

#### Motivation

I spend most of my time these days developing web apps on client side in ClojureScript.
And for page inspection and debugging I stay most of the time in the DevTools.
Over time I realized that a few possible DevTools tweaks would greatly improve my ClojureScript experience.
Especially integrating ClojureScript REPL into DevTools Javascript Console would be a pretty huge deal.

##### A bit of history

Chrome/Blink developers have been pretty open for adding extensibility points to their DevTools platform.
Traditionally one has been able to implement a Chrome extension which could register additional panels in Chrome DevTools.
Actually Suprematic have implemented their [ClojureScript REPL extension](http://blog.suprematic.net/2014/02/chrome-devtools-repl-for-clojurescript_26.html) this way back in 2014.
Also more recently [React Developer Tools](https://github.com/facebook/react-devtools) use this approach.

The problem with extra panels is that that they don't integrate well with existing panels. They are separate "apps" injected
into DevTools UI. For example for best user experience the ClojureScript REPL should be very closely integrated with
Javascript Console in my opinion. There should be no switching between panels.

A big improvement was an introduction of [custom formatters](https://docs.google.com/document/d/1FTascZXT9cxfetuPRT2eXPQKXui4nWFivUnS_335T3U) in early 2015.
This allowed to enhance presentation of ClojureScript values directly in Javascript Console and without the need to install an extension.
I have implemented the [cljs-devtools](https://github.com/binaryage/cljs-devtools) library which leveraged this feature.

Also I have filled a [request for a new extension point](https://code.google.com/p/chromium/issues/detail?id=484261) which would
potentially allow me to implement REPL functionality in a similar way how custom formatters work. Unfortunately existing DevTools extension
APIs weren't suitable for what I wanted to do.

There has been some progress made on that issue but after six months of waiting I decided to fork the DevTools.

##### A divergent fork?

I don't have an ambition to merge this project upstream into official DevTools.
Dirac changes are too specific for ClojureScript (and mostly implemented in ClojureScript).
Instead, the idea is to maintain a set of patches rolling on top of official DevTools branch.

Turns out, it is not that big deal at the end of the day. I also provide the [Dirac Chrome Extension](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi)
which wraps Dirac DevTools to make installation and life a bit easier for Dirac users. The experience should be very similar
to integrated DevTools - you just use a different keyboard shortcut to open it.

Also I view Dirac as an experimental test ground where new DevTools features can be implemented.
Not only for ClojureScript but maybe for other compile-to-js languages as well. It could serve as a proof-of-concept
implementation of some niche features or extension points requested or planned in the official DevTools.

I'm pretty sure DevTools will evolve and will be adding new extension points in the future.
That means some Dirac features could move into official DevTools at some point eventually.
The main benefit of having a live fork in place is that "we" as ClojureScript community don't have to wait
for "them" (Google) to add "our" features, so we can move quickly.

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

##### Installation

TODO: here I will explain detailed info about full installation and configuration.

Please note that you should always use the latest Chrome Canary with Dirac DevTools to prevent any compatibility issues.

### Credits

* [Antonin Hildebrand](https://github.com/darwin) - [cljs-devtools](https://github.com/binaryage/cljs-devtools), [chromex](https://github.com/binaryage/chromex)
* [Shaun LeBron](https://github.com/shaunlebron) - [parinfer](https://github.com/shaunlebron/parinfer)

---

#### License [MIT](license.txt)