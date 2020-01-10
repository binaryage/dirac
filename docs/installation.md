# Dirac DevTools Installation

Dirac integration with your project requires some effort and can be configured in many ways.
In this document I will discuss standard configuration with Leiningen. For custom configuration please refer to 
[configuration.md](configuration.md).

If this is your first Dirac installation and you are not familiar with Dirac features
I first recommend following [the demo in Dirac Example project](https://github.com/binaryage/dirac/tree/master/examples/leiningen) 
to learn the basics and test-drive Dirac on a properly-configured project.

Here are the ingredients you are going to need:

1. [Dirac CLI tool](cli.md) - a convenience launcher for Chrome 
1. Dirac Runtime - a ClojureScript library installed in your page
1. [nREPL](https://github.com/nrepl/nrepl) server with Dirac nREPL middleware
1. Dirac Agent - a helper server providing a proxy tunnel between the nREPL server and the Dirac 

### Launch Chrome with Dirac DevTools

Install [Dirac CLI tool](cli.md) and then launch:

```
> dirac
```

This should launch Chrome Canary with internal DevTools replaced by Dirac DevTools.

Please refer to [Dirac CLI documentation](cli.md) for details. Also note that there is an alternative workflow of using
[Dirac DevTools hosted in Chrome Extension](extension.md) (old method). 

### Install the Dirac Runtime

Add binaryage/dirac as a new dependency to your project:

[![Clojars Project](https://img.shields.io/clojars/v/binaryage/dirac.svg)](https://clojars.org/binaryage/dirac)

    :dependencies [[binaryage/dirac "<DIRAC-VERSION>"]] ;; Use the version from the Clojars badge above

You will also need to install runtime support in your main page(s):

#### Installation via preloads

Simply add `dirac.runtime.preload` into your `:preloads` list.

In this mode, Dirac runtime can be additionally configured via `:external-config > :dirac.runtime/config`. More 
[details here](https://github.com/binaryage/dirac/blob/master/docs/configuration.md#dirac-runtime---page-specific-configuration).

#### Installation from code

```clojure
(ns your-project.namespace
  (:require [dirac.runtime]))

(dirac.runtime/install!)
```

### Start nREPL server with Dirac Agent

There are many possible ways how to start an nREPL server. We are going to use Leiningen's nREPL server here.

By default you should run it on port `8230` and with `dirac.nrepl/middleware` middleware.

The configuration snippet could look something like this:

    :repl-options {:port 8230
                   :nrepl-middleware [dirac.nrepl/middleware]
                   :init (do
                           (require 'dirac.agent)
                           (dirac.agent/boot!))}
                   
Now when you start `lein repl` from command-line you should see something like this:

    nREPL server started on port 8230 on host 127.0.0.1 - nrepl://127.0.0.1:8230
    REPL-y 0.4.3, nREPL 0.5.3
    Clojure 1.10.0
    Java HotSpot(TM) 64-Bit Server VM 11+28
        Docs: (doc function-name-here)
              (find-doc "part-of-name-here")
      Source: (source function-name-here)
     Javadoc: (javadoc java-object-or-class-here)
        Exit: Control+D or (exit) or (quit)
     Results: Stored in vars *1, *2, *3, an exception in *e
    
    user=>
    Dirac Agent v1.3.0
    Connected to nREPL server at nrepl://localhost:8230.
    Agent is accepting connections at ws://localhost:8231.

The last line should remind you that Dirac Agent started successfully and is listening for browser connections on port 8231.

Now you should be able to use REPL from any of your Dirac DevTools instances.

<details>

I tend to put this extra config under `:repl` profile in my `project.clj` files
(see an [example here](https://github.com/binaryage/dirac/tree/master/examples/leiningen/project.clj)).

Please note that Dirac middleware
was implemented as a [Piggieback middleware](https://github.com/nrepl/piggieback) fork, so you cannot run both.
Think of Dirac middleware as a Piggieback middleware replacement with some extra features specific to Dirac DevTools.

Please note that Dirac DevTools frontend is "just" a web app. It cannot open a classic TCP socket connection and talk to the nREPL server directly.
Instead it connects to a Dirac Agent instance which listens for web socket connections on port 8231. Dirac Agent in turn has an open connection
to your nREPL server at port 8230 so it can bridge messages between the two. Tunneling messages between
the browser and the nREPL server is the main feature of Dirac Agent. Sometimes you might see (error) messages mentioning "nREPL Tunnel",
which is a component of Dirac Agent.

Actually Dirac Agent is a bit smarter than that. It allows one-to-many scenario where multiple Dirac DevTools instances
can connect to a singe Dirac Agent which talks to a single nREPL server. Each Dirac DevTools instance is assigned its own nREPL session
so they don't step on each others' toes. Thanks to sessions you can open multiple pages with different Dirac DevTools and
they all can have their own independent REPLs.

Unfortunately this is the hardest part of the setup and most fragile.
If you run into issues it is pretty difficult to troubleshoot it without deeper understanding
[how nREPL works internally](https://github.com/nrepl/nrepl), what [Piggieback](https://github.com/nrepl/piggieback) is,
how [Weasel](https://github.com/tomjakubowski/weasel) comes into play and how Dirac Agent orchestrates all this.

If you hit a wall you can try to ask for help in the `#dirac` channel at http://clojurians.slack.com ([ask for an invitation here](http://clojurians.net/)).

</details>
