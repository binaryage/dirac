# dirac-lein

This project is an example of integration of [**Dirac DevTools**](https://github.com/binaryage/dirac) into a Leiningen-based 
ClojureScript project.

![main screenshot](https://box.binaryage.com/dirac-main-01.png)

## Local setup

```bash
git clone https://github.com/binaryage/dirac.git
cd dirac/examples/leiningen
```

## Demo time

#### Overview:

1. launch `lein repl` in a separate terminal session
1. launch `lein demo` in a separate terminal session
1. launch Chrome with `dirac` CLI tool
1. play with REPL in the DevTools Console

### Details

First please [install Dirac CLI tool](https://github.com/binaryage/dirac/blob/master/docs/cli.md).

Now you can launch the repl from terminal:

```
> lein repl
nREPL server started on port 8230 on host 127.0.0.1 - nrepl://127.0.0.1:8230
REPL-y 0.4.3, nREPL 0.6.0
Clojure 1.10.1
OpenJDK 64-Bit Server VM 1.8.0_222-b10
    Docs: (doc function-name-here)
          (find-doc "part-of-name-here")
  Source: (source function-name-here)
 Javadoc: (javadoc java-object-or-class-here)
    Exit: Control+D or (exit) or (quit)
 Results: Stored in vars *1, *2, *3, an exception in *e

user=>
Dirac Agent v1.4.3
Connected to nREPL server at nrepl://localhost:8230.
Agent is accepting connections at ws://localhost:8231.
```

The last three lines ensure you that Dirac Agent was launched alongside your nREPL server. It connected to it and is accepting
DevTools connections on the websocket port 8231.

Now you can launch the demo project from terminal:

```
> lein demo
```

After it starts, you can launch Chrome using `dirac`:

```
> dirac
Located Chromium executable at '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'.
Detected Chromium version '81.0.4023.0'
Resolved matching Dirac release as '1.5.0'
Matching Dirac release is located at '/Users/darwin/.dirac/silo/v/1.5.0'
Preparing playground environment at '/Users/darwin/.dirac/playground'
Compiling playground project...
Starting playground HTTP server on port 9112
Booting Dirac Agent...
Starting nREPL server v0.6.0 on port 36180

Dirac Agent v1.5.0
Connected to nREPL server at nrepl://localhost:36180.
Agent is accepting connections at ws://localhost:36181.
Launching Chromium [with --user-data-dir='/Users/darwin/.dirac/chromium/profiles/default'] ...
```
 
In launched Chrome please navigate [http://localhost:9977](http://localhost:9977),

In Chrome open DevTools (CTRL+SHIFT+I or CMD+OPT+I on a Mac).
 
It will look almost the same as normal DevTools, but you can tell the difference at first glance: active tab highlight
will be green instead of blue (see the screenshots above).

Ok, now you can switch to Javascript Console in Dirac DevTools. 

Connected? You should see `cljs.user` indicating your current namespace. The REPL is ready for your input at this point. 
You can try:

```clojure
(+ 1 2)
js/window
(doc filter)
(filter odd? (range 42))
```

If you see something very similar to the first screenshot at the top, you have Dirac running properly.

### Hello, World!

Let's try to call `hello!` function from our namespace `dirac-lein.demo`.

```clojure
(dirac-lein.demo/hello! "World")
```

It worked `"Hello, World!"` was logged into the console (white background means that the logging output originated in Javascript land).

As you probably know you should first require (or eval) namespace in the REPL context to make it aware of namespace content.

```clojure
(require 'dirac-lein.demo)
```

But still you have to type fully qualified name because currently you are in `cljs.user` namespace. To switch you can use `in-ns` special function.

Let's try it:

```clojure
(in-ns)
```

You get an error `java.lang.IllegalArgumentException: Argument to in-ns must be a symbol.`. This is a Java exception from nREPL side.
 Execute `(doc in-ns)` to see the documentation for this special REPL function. It expects namespace name as the first argument.

```clojure
(in-ns 'dirac-lein.demo)
(hello! "Dirac")
```

Should log `Hello, Dirac!` into the console without warnings.

### Breakpoints

You can also test evaluation of ClojureScript in the context of selected stack frame when paused on a breakpoint:

1. click the "demo a breakpoint" button on the page
2. debugger should pause on the `(js-debugger)` line in the breakpoint-demo function

Custom formatters should be presented as inlined values in the source code.
Also property names in the scope panel are sorted and displayed in a more friendly way.

Now hit ESC to bring up console drawer. Make sure you are switched to Dirac REPL and then enter:

```
numbers
```

You should see actual value `(0 1 2)` of the `numbers` variable from local scope (formatted by custom formatters from cljs-devtools).
Same way as you would expect when evaluating a Javascript command in a breakpoint context. Actually you can try it.
Hit `CTRL+.` to switch to Javascript console prompt (white background) and enter:

```
numbers
```

This should return the same output.

And now return back to Dirac REPL by pressing `CTRL+.` again and enter:

```clojure
(str (map inc numbers))
```

You should get back a string `"(1 2 3)"`.

This is a proof that Dirac REPL can execute arbitrary ClojureScript code in the context of a selected stack frame.
