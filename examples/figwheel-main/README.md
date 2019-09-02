# dirac-figmain

This project is an example of integration of [**Dirac DevTools**](https://github.com/binaryage/dirac) into a
ClojureScript project with [Figwheel Main](https://github.com/bhauman/figwheel-main).

![main screenshot](https://box.binaryage.com/dirac-figwheel-main-01.png)

## Local setup

    git clone https://github.com/binaryage/dirac.git
    cd dirac/examples/figwheel-main

## Demo time

### Installation

Launch latest [Chrome Canary](https://www.google.com/chrome/browser/canary.html) from command-line.
I recommend to run it with a dedicated user profile, because you will install there a helper [Chrome Extension](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi).
Also you have to run it with [remote debugging](https://developer.chrome.com/devtools/docs/debugger-protocol) enabled on port 9222 (better make an alias of this command):

    /Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary \
      --remote-debugging-port=9222 \
      --no-first-run \
      --user-data-dir=.test-dirac-chrome-profile

Now you can install the [Dirac DevTools Chrome extension](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi).

After installation, should see a new extension icon next to your address bar <img src="https://box.binaryage.com/dirac-extension-icon.png" height="32">.

Now you can launch the project from terminal:

    ./scripts/repl.sh

After it fully starts, you should see something like:

    [Figwheel] Validating figwheel-main.edn
    [Figwheel] figwheel-main.edn is valid \(ツ)/
    [Figwheel] Compiling build dev to "target/public/cljs-out/dev-main.js"
    [Figwheel] Successfully compiled build dev to "target/public/cljs-out/dev-main.js" in 3.254 seconds.
    [Figwheel] Outputting main file: target/public/cljs-out/dev-main-auto-testing.js
    [Figwheel] Watching paths: ("test" "src/main") to compile build - dev
    [Figwheel] Starting Server at http://localhost:9500
    JavaScript environment will not launch automatically when :open-url is false
    Starting nREPL server v0.6.0 on port 8230

    Dirac Agent v1.4.0
    Connected to nREPL server at nrepl://localhost:8230.
    Agent is accepting connections at ws://localhost:8231.

It tries to communicate three things:

1. you have nREPL server running on port 8230
2. you have Dirac Agent connected to it and listening to Dirac DevTools connections on port 8231
3. you have Figwheel Main watching your "dev" build and serving your site at http://localhost:9500  

At this point you should have a demo website accessible at [http://localhost:9500](http://localhost:9500).

Please navigate there, do not open internal DevTools and click Dirac icon while on the `http://localhost:9977/demo.html` page.
It should open you a new window with Dirac DevTools app.
It will look almost the same as internal DevTools, but you can tell the difference at first glance: active tab highlight
will be green instead of blue (see the screenshots above).

Ok, now you can switch to Javascript Console in Dirac DevTools. Focus prompt field and press `CTRL+,` or `CTRL+.`.
This will cycle between Javascript to ClojureScript REPL prompts.

Connected? The red message should go away and you should see `cljs.user >> figwheel.main/dev` indicating your
current namespace and that you are actually using Figwheel's compiler.
REPL is ready for your input at this point. You can try:

    (+ 1 2)
    js/window
    (cljs.repl/doc filter)
    (filter odd? (range 42))

If you see something very similar to the first screenshot at the top, you have Dirac running properly.

**Congratulations!**

### Hello, World!

Let's try to call `hello!` function from our namespace `dirac-figmain.core`.

    (dirac-figmain.core/hello! "World")

It worked `"Hello, World!"` was logged into the console (white background means that the logging output originated in Javascript land).

You have to type fully qualified name because currently you are in `cljs.user` namespace. To switch you can use `in-ns` special function.

Let's try it:

    (in-ns)

You get an error `java.lang.IllegalArgumentException: Argument to in-ns must be a symbol.`. This is a Java exception from nREPL side.
Execute `(doc in-ns)` to see the documentation for this special REPL function. It expects namespace name as the first argument.

    (in-ns 'dirac-figmain.core)
    (hello! "Dirac")

Should log `Hello, Dirac!` into the console without warnings.

### Breakpoints

You can also test evaluation of ClojureScript in the context of selected stack frame when paused on a breakpoint:

1. click the "demo a breakpoint" button on the page
2. debugger should pause on the `(js-debugger)` line in the breakpoint-demo function

Custom formatters should be presented as inlined values in the source code.
Also property names in the scope panel are sorted and displayed in a more friendly way.

Now hit ESC to bring up console drawer. Make sure you are switched to Dirac REPL and then enter:

    numbers

You should see actual value `(0 1 2)` of the `numbers` variable from local scope (formatted by custom formatters from cljs-devtools).
Same way as you would expect when evaluating a Javascript command in a breakpoint context. Actually you can try it.
Hit `CTRL+.` to switch to Javascript console prompt (white background) and enter:

    numbers

This should return the same output.

And now return back to Dirac REPL by pressing `CTRL+.` again and enter:

    (str (map inc numbers))

You should get back a string `"(1 2 3)"`.

This is a proof that Dirac REPL can execute arbitrary ClojureScript code in the context of a selected stack frame.

## More tips

Skeleton of this project was generated from official [Figwheel Main template](https://rigsomelight.com/figwheel-main-template/).

### To clean all compiled files

    ./scripts/clean.sh

### To create a production build run

    ./scripts/clean.sh
    clojure -A:fig:min

### You can control Figwheel Main via Dirac

In Dirac REPL you show docs by:

    (dirac :help :fig2)

For example you can force on-off build:

    (dirac :fig2 :build-once "my-build-id")

### You can connect to your nREPL server from other clients as well

1. You can connect from Cursive via "Clojure REPL -> Remote"
2. Or, if you have Leiningen, you can connect via `lein repl :connect 8230`

To join Dirac REPL session you might want to issue `(dirac :join)` after connection. See [integration doc page](https://github.com/binaryage/dirac/blob/master/docs/integration.md).

![Cursive screenshot](https://box.binaryage.com/dirac-figwheel-main-02.png)
![Dirac with Cursive screenshot](https://box.binaryage.com/dirac-figwheel-main-03.png)



