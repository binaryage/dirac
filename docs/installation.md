# Dirac DevTools Installation

Dirac integration with your project requires some effort and can be configured in many ways.
In this document I will discuss standard configuration with Leiningen. For custom configuration refer to [this document](configuration.md).

If this is your first Dirac installation and you are not familiar with Dirac features
I first recommend following [the demo walktrough in Dirac Example project](https://github.com/binaryage/dirac-sample) to learn
the basics and test-drive Dirac on properly-configured project.

Here are the ingredients you are going to need:

1. [Dirac Chrome Extension](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi) installed in your Chrome Canary
1. Dirac Runtime - a ClojureScript library installed in your page
1. nREPL server with Dirac nREPL middleware
1. Dirac Agent - a helper server providing a proxy tunnel between nREPL server and DevTools web app

#### Setup Dirac Chrome Extension

Please note that [you should always use the latest Chrome Canary](faq.md#why-should-i-use-recent-chrome-canary-with-dirac-devtools) with Dirac DevTools to prevent any compatibility issues.

You probably want to run your Chrome Canary with dedicated user profile. And you have to run it with [remote debugging](https://developer.chrome.com/devtools/docs/debugger-protocol) enabled.

    /Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary \
      --remote-debugging-port=9222 \
      --no-first-run \
      --user-data-dir=$A_PATH_TO_YOUR_USER_PROFILE_DIRECTORY

Please note that `--remote-debugging-port` should be 9222 by default. But you can change it in the Dirac Extension `options page` if needed.

Now install the [Dirac Chrome Extension](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi). Chrome should keep it up-to-date for you.

#### Install the Dirac Runtime

You should add the Dirac dependency to your project:

[![Clojars Project](https://img.shields.io/clojars/v/binaryage/dirac.svg)](https://clojars.org/binaryage/dirac)

    :dependencies [[binaryage/dirac "<DIRAC-VERSION>"]]

And also install runtime support in your main page(s):

```clojure
(ns your-project.namespace
  (:require [dirac.runtime]))

(dirac.runtime/install!)
```

#### Start nREPL server

There are many ways how to start an nREPL server. We will use Leiningen's nREPL server here.

By default you should run it on port `8230` and with `dirac.nrepl/middleware` middleware. Please note that Dirac middleware
was implemented as a [Piggieback middleware](https://github.com/cemerick/piggieback) fork, so you cannot run both.
Think of Dirac middleware as Piggieback middleware replacement with some extra features specific to Dirac DevTools.

The configuration snippet could look something like this:

    :repl-options {:port 8230
                   :nrepl-middleware [dirac.nrepl/middleware]}

Replace `<DIRAC-VERSION>` with actual version of your Dirac Runtime.

I tend to put this extra config under `:repl` profile in my `project.clj` files
(see an [example here](https://github.com/binaryage/dirac-sample/blob/master/project.clj)).

#### Start Dirac Agent

Dirac Agent is a program which connects to an existing nREPL server and acts as a proxy providing nREPL connections to the browser.

Please note that Dirac DevTools frontend is "just" a web app. It cannot open a classic TCP socket connection and talk to the nREPL server directly.
Instead it connects to a Dirac Agent instance which listens for web socket connections on port 8231. Dirac Agent has also an open connection
to your nREPL server at port 8230 so it can bridge messages between those two. Tunneling messages between
the browser and the nREPL server is main feature of Dirac Agent, sometimes you might see (error) messages mentioning "nREPL Tunnel",
which is a component of Dirac Agent.

Actually Dirac Agent is a bit smarter than that. It allows one-to-many scenario where multiple Dirac DevTools instances
can connect to a singe Dirac Agent which talks to a single nREPL server. Each Dirac DevTools instance is assigned its own nREPL session
so they don't step on each others' toes. Thanks to sessions you can open multiple pages with different Dirac DevTools and
they all can have their own independent REPLs.

Unfortunately this is the hardest part of the setup and most fragile.
If you run into issues it is pretty difficult to troubleshoot it without deeper understanding
[how nREPL works internally](https://github.com/clojure/tools.nrepl), what [Piggieback](https://github.com/cemerick/piggieback) is,
how [Weasel](https://github.com/tomjakubowski/weasel) comes into play and how Dirac Agent orchestrates all this.

If you hit a wall you can try to ask for help in the `#dirac` channel at http://clojurians.slack.com ([ask for an invitation here](http://clojurians.net/)).

Now let's get back to launching the Dirac Agent. You can wrap it as a command-line tool and run it. The source for cli tool is [here](https://github.com/binaryage/dirac/blob/master/src/agent/dirac/agent_cli.clj).
Here is a custom launcher script which uses maven to download dirac jar and execute `agent-cli` with your current java env from command-line:

[https://github.com/binaryage/dirac/blob/master/scripts/agent-launcher.sh](https://github.com/binaryage/dirac/blob/master/scripts/agent-launcher.sh)

But I have a better idea. Why to spin yet another JVM just to run this tiny server? Let's use our existing nREPL process
and start the Dirac Agent there. This will effectively run nREPL server and Dirac Agent in one process side-by-side.

You can configure it as `:init` command which will be executed every time you start your REPL. Simply add this to your
`:repl-options` for Leiningen:

    :repl-options {:init (do
                           (require 'dirac.agent)
                           (dirac.agent/boot!))}

Now when you start `lein repl` from command-line you should see something like this:

    nREPL server started on port 8230 on host 127.0.0.1 - nrepl://127.0.0.1:8230
    REPL-y 0.3.7, nREPL 0.2.10
    Clojure 1.8.0
    Java HotSpot(TM) 64-Bit Server VM 1.8.0_60-b27
        Docs: (doc function-name-here)
              (find-doc "part-of-name-here")
      Source: (source function-name-here)
     Javadoc: (javadoc java-object-or-class-here)
        Exit: Control+D or (exit) or (quit)
     Results: Stored in vars *1, *2, *3, an exception in *e

    user=>
    Dirac Agent v0.2.0
    Connected to nREPL server at nrepl://localhost:8230.
    Tunnel is accepting connections at ws://localhost:8231.

The last line should remind you that Dirac Agent started successfully and listens for browser connections on port 8231.

Now you should be able to use REPL from any of your Dirac DevTools instances.