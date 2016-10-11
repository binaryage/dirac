# Dirac REPL

The goal of this article is to help you better understand Dirac REPL and its internals.

This is not an intro article. If you are not familiar with REPL concepts please first study 
["The Ultimate Guide To Clojure REPLs"](https://lambdaisland.com/guides/clojure-repls) by Lambda Island. 

## The LISP machine

Let's start with the mythical LISP machine with working REPL. 

 * we have a machine running a LISP interpreter
 * REPL is internal part of the interpreter and 'eval' directly alters the machine state
 * UI reads inputs and prints outputs back

```
  ┌────────────────────┐
 ┌┤      machine       ├────────────────┐
 │└────────────────────┘                │
 │┌ ─ ─ ─ ─ ─ ─ ─ ─  LISP interpreter ─ │
 │                                     ││
 ││                                     │
 │                                     ││
 ││                                     │
 │           machine state ■           ││
 ││                        │            │
 │                         │           ││
 ││                        │            │
 │                         │           ││
 ││                        │            │ ╭──────────────────────────────────╮
 │            ┌─────────┐  │           ││ │ ◎ ○ ○ ░░░░   UI    ░░░░░░░░░░░░░░│
 ││ ┌─────────┤  REPL   │  │            │ ├──────────────────────────────────┤
 │  │         └─────────┤  │           ││ │                                  │
 ││ │  ┌───▶ Read  ─────┼──┼─────┐      │ │                                  │
 │  │  │     Eval  ─────┼──┘     │     ││ │ user=> (str "Hello, " "REPL!")   │
 ││ │  ▲     Print ─────┼────────┼──────┼▶│ "Hello, REPL!"                   │
 │  │  └──── Loop       │        │     ││ │                                  │
 ││ └───────────────────┘        └──────┼▶│ user=> ▉                         │
 │                                     ││ │                                  │
 ││                                     │ │                                  │
 │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘│ └──────────────────────────────────┘
 └──────────────────────────────────────┘
```

## Basic Clojure REPL

Fast forward to 2007! Basic Clojure REPL is not much different from the LISP machine. 
Except that Clojure is not a LISP interpreter. It is a compiler!

  * we have a JVM containing Clojure runtime environment running our app
  * inside the process we have one global compiler state which is used for 'eval' (compile+exec)
  * UI reads inputs and prints outputs back (as usual)

```
═════════  many layers: HW, VM, OS, ps

  ┌────────────────────┐
 ┌┤    JVM process     ├────────────────┐
 │└────────────────────┘                │
 │┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
 │                   ┌─ ── ── ── ── ─┐ ││
 ││                  │                  │
 │                    compiler state │ ││
 ││                  │               │  │
 │                   └ ── ── ── ── ──  ││
 ││                          ▲          │
 │                           │         ││
 ││     Java/Clojure state ■ │          │
 │                         │ │         ││
 ││                        │ │          │
 │            ┌─────────┐  │ │         ││ ╭──────────────────────────────────╮
 ││ ┌─────────┤ R(CE)PL │  │ │          │ │ ◎ ○ ○ ░░░░   UI    ░░░░░░░░░░░░░░│
 │  │         └─────────┤  │ │         ││ ├──────────────────────────────────┤
 ││ │  ┌───▶ Read  ─────┼──┼─┼───┐      │ │                                  │
 │  │  │     Compile ───┼──┼─┘   │     ││ │                                  │
 ││ │  ▲     Exec   ────┼──┘     │      │ │ user=> (str "Hello, " "REPL!")   │
 │  │  │     Print ─────┼────────┼─────┼┼▶│ "Hello, REPL!"                   │
 ││ │  └──── Loop       │        │      │ │                                  │
 │  └───────────────────┘        └─────┼┼▶│ user=> ▉                         │
 ││                                     │ │                                  │
 │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘│ │                                  │
 └──────────────────────────────────────┘ └──────────────────────────────────┘
```

## Clojure nREPL

What about connecting to REPL over a network? Let's forward to 2011 and introduce [nREPL](https://github.com/clojure/tools.nrepl). 
The idea is quite straightforward: let's split the traditional in-process REPL into 
an nRELP server and an nREPL client. The client will be responsible for 'read' and 'print'
and the server will provide 'compile' and 'exec'.

  * JVM is running our app as well as nREPL server
  * client can connect and send us messages requesting 'eval'
  * we must define some client-server protocol for communication

```
  ┌────────────────────┐
 ┌┤    JVM process     ├────────────────┐
 │└────────────────────┘                │
 │┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
 │                   ┌─ ── ── ── ── ─┐ ││
 ││                  │                  │
 │                    compiler state │ ││
 ││                  │               │  │
 │                   └ ── ── ── ── ──  ││
 ││                          ▲          │
 │                           │         ││
 ││     Java/Clojure state ■ │          │
 │                         │ │         ││
 ││                        │ │          │
 │       ┌──────────────┐  │ │         ││
 ││ ┌────┤ nREPL server │  │ │          │
 │  │    └──────────────┤  │ │         ││
 ││ │  ┌───▶ Listen  ◀──┼──┼─┼─┐        │
 │  │  │     Compile ───┼──┼─┘ │       ││
 ││ │  ▲     Exec   ────┼──┘   │        │
 │  │  │     Respond ───┼──────┼──┐    ││
 ││ │  └──── Loop       │      │  │     │
 │  └───────────────────┘      │  │    ││
 ││                            │  │     │
 │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┼ ─│─ ─ ┘│
 └─────────────────────────────┼──┼─────┘
                               │  │
                               │  │
                             network
                         nREPL transport
                               │  │
         ┌──────────────┐      │  │       ╭──────────────────────────────────╮
    ┌────┤ nREPL client │      │  │       │ ◎ ○ ○ ░░░░   UI    ░░░░░░░░░░░░░░│
    │    └──────────────┤      │  │       ├──────────────────────────────────┤
    │  ┌───▶ Read    ───┼──────┼──┼──┐    │                                  │
    │  │     Send    ───┼──────┘  │  │    │                                  │
    │  ▲     Receive ◀──┼─────────┘  │    │ user=> (str "Hello, " "REPL!")   │
    │  │     Print   ───┼────────────┼───▶│ "Hello, REPL!"                   │
    │  └──── Loop       │            │    │                                  │
    └───────────────────┘            └───▶│ user=> ▉                         │
                                          │                                  │
                                          │                                  │
                                          └──────────────────────────────────┘
```

## Clojure nREPL middleware

But we want more flexibility. We want our nREPL server to be pluggable. 
We want it to do more than just 'eval'. We want it to 'handle' various additional 
queries from client side. For example because nREPL server has access to the global compiler
state it would be handy to provide code-completions and some other introspection services.

Let's implement it as middleware concept. We can configure nREPL server
to load a stack of [middleware handlers](https://github.com/clojure/tools.nrepl#middleware) during startup. Later, when handling a request
message we simply let it to be processed by the middleware cascade. We also implement the 
original eval functionality as a new "eval" middleware which will be enabled by default. 

And when we are at it. Let's make also the networking protocol pluggable. Anyone can
provide their own replacement called [transport](https://github.com/clojure/tools.nrepl#transports-). As a nice exercise we implement 
a bencode transport over sockets and use it by default.

```
  ┌────────────────────┐
 ┌┤    JVM process     ├────────────────┐
 │└────────────────────┘                │
 │┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
 │                   ┌─ ── ── ── ── ─┐ ││
 ││                  │                  │
 │                    compiler state │ ││
 ││                  │               │  │
 │                   └ ── ── ── ── ──  ││
 ││                          ▲          │
 │                           │         ││
 ││     Java/Clojure state ■ │          │
 │                         │ │         ││
 ││                        │ │          │
 │                    ┌────┴─┴───────┐ ││
 ││ ┌─────────────────┤ nREPL server │◀─┼──┐
 │  │                 └──────────────┤ ││  │
 ││ │ ┌──▶ Listen                    │  │  │
 │  │ │                              │ ││  │
 ││ │ │    Handle ──┐ * middleware A │  │  │
 │  │ │             │ * middleware B │ ││  │
 ││ │ │             │ * ...          │  │  │
 │  │ └─── Loop ◀───┘ * middleware N │ ││  │
 ││ └────────────────────────────────┘  │  │
 │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘│  │
 └──────────────────────────────────────┘  │
                                           │
                                        network
                                    nREPL transport
                                           │
                                           │
                                   ┌──────────────┐    ┌────┐
                                   │ nREPL client │───▶│ UI │
                                   └──────────────┘    └────┘
```

## Clojure nREPL sessions

Our nREPL server is working just great. Sometimes we use two or more of them.
It would be handy instead of spinning yet another JVM instance to 
somehow share one process for multiple independent REPL sessions.
 
Let's see if we could implement it as a middleware.
We could maintain a list of compiler/environment states and for each request
we swap-in correct state matching request's session-id. So that subsequent compilation/eval
calls will use session's state.

For this trick to work our 'session' middleware must be configured to 
go first (or very early before 'eval' middleware).

Also when we are at it. Let's remove 'eval' middleware and replace it with 'ieval' by default.
It stands for "interruptible-eval". It runs evaluations on separate threads, assigns them
ids and allows their interruption. Hopefully nREPL clients will support this.

  * we have a JVM with Clojure runtime environment running our app
  * inside the process we multiple compiler states (each for one session)
  * multiple nREPL clients are supported, each has own session
  * how clients read inputs and present outputs is not our concern anymore

```
  ┌────────────────────┐
 ┌┤    JVM process     ├─────────────────────────────────────────────────────┐
 │└────────────────────┘                                                     │
 │┌ ─Java/Clojure state ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐│
 │  ┌─────────────────────────────────────────────────────────────────────┐  │
 ││ │           ┌─ ── ── ── ── ─┐  ┌─ ── ── ── ── ─┐     ┌─ ── ── ── ── ─┐│ ││
 │  │           │    ┌ ─ ─ ─ ─ ┐   │    ┌ ─ ─ ─ ─ ┐      │    ┌ ─ ─ ─ ─ ┐ │  │
 ││ │           │     compiler1 │  │     compiler2 │ ... │     compilerN ││ ││
 │  │                └ ─ ─ ─ ─ ┘│       └ ─ ─ ─ ─ ┘│          └ ─ ─ ─ ─ ┘││  │
 ││ │           │                  │                     │                │ ││
 │  │           │session1 state │  │session2 state │     │sessionN state ││  │
 ││ │            ── ── ── ── ── ┘   ── ─┬ ── ── ── ┘      ── ── ── ── ── ┘│ ││
 │  │                   △               │  ▲                     △        │  │
 ││ │                   └ ─ ─ ─ ─ ─ ─ ─ ┼ ─│─ ─ ─ ─ ─ ┬ ─ ─ ─ ─ ─         │ ││
 │  │                                   │  └──────────┐                   │  │
 ││ │                                   │             │                   │ ││
 │  │ ┌──▶ Listen                       │             │                   │  │
 ││ │ │                                 │  ┌──────────┴─────────┐         │ ││
 │  │ │    Handle ──┐ * session ────────┼─▶│ session selection  │         │  │
 ││ │ │             │ * ieval   ────────┘  └────────────────────┘         │ ││
 │  │ │             │ * ...                                               │  │
 ││ │ └─── Loop ◀───┘ * middleware N                      ┌──────────────┐│ ││
 │  └─────────────────────────────────────────────────────┤ nREPL server ├┘  │
 ││                                                       └──────────────┘  ││
 │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ▲ ─▲─ ▲ ─ ─ ─ ─ │
 └───────────────────────────────────────────────────────────┼──┼────────────┘
                          ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │  │
                                             ┌──────────────────┘
                       network            network               network
                                             │
                          │                  │                     │
                  ┌───────────────┐  ┌───────────────┐     ┌───────────────┐
                  │ nREPL client1 │  │ nREPL client2 │ ... │ nREPL clientN │
                  └───────────────┘  └───────────────┘     └───────────────┘
```

## Compiling ClojureScript

[ClojureScript](https://github.com/clojure/clojurescript) is cool, we want to use it! 

For a moment forget about your fancy build tools and think about ClojureScript as a Clojure library. 
At core the library provides `build-cljs` function which accepts Clojure-like code as input and 
produces a string which happens to be executable Javascript code.

The function `build-cljs` needs state. It is used for compilation configuration and also as optimizations
for subsequent incremental compilations. As you know, ClojureScript macros are written in Clojure
so Clojure's own global compiler state may be used during ClojureScript compilation.
 
So our nREPL session has to keep track of own state variables, Clojure compiler state
and ClojureScript compiler together. Whenever a session requests to compile
some ClojureScript snippet we must be ready to bind all relevant state to prepare proper compilation environment.

```
   ┌────────────────────┐
  ┌┤    JVM process     ├─────────────────────────────────────────────────────┐
  │└────────────────────┘                                                     │
  │┌ ─Java/Clojure state ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐│
  │                          ┌─ ── ── ── ── ── ── ── ── ── ── ── ── ── ── ─┐  │
  ││                               ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   ││
  │                          │            ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │  │
  ││                         │     │                                   │ │ │ ││
  │                                       │                                   │
  ││   build-cljs    ────────┼─────┼───────────■  ClojureScript        │ │ │ ││
  │    -> string             │            │       compiler state           │  │
  ││                               │                                   │ │   ││
  │    compile-clj   ────────┼──┐         │                                │  │
  ││   -> bytecode           │  │  │       ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │ │ ││
  │                             │                                             │
  ││   eval-bytecode ────────┼─┐│  │                                     │ │ ││
  │    -> result             │ │└───────■  Clojure compiler state          │  │
  ││                           │   └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   ││
  │                          │ │                                           │  │
  ││                         │ │                                           │ ││
  │                            └───────────■  session state                   │
  ││                         └─ ── ── ── ── ── ── ── ── ── ── ── ── ── ── ─┘ ││
  │                                                                           │
  ││                                                                         ││
  │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
  └───────────────────────────────────────────────────────────────────────────┘
```

## Executing ClojureScript

Ok, fine. We know how to use ClojureScript library to produce Javascript strings, but how to run them?

We will need a browser or something similar which can actually run our Javascript code. It is the year of 2016 and usually
Javascript environments don't come with ClojureScript nREPL support built-in. We have to install some kind of
"slave" process inside our Javascript runtime and allow it to communicate with our nREPL server. This slave
will act as a server to fulfil Javascript evaluation requests issued from our nREPL master (which is a client 
in this relationship). Confusing? Forget client/server and see the diagram below.

Please note that the slave should not only execute the code for side-effects but should also 
return the result of evaluation as a reply. We are leaving Javascript world, so this reply must be somehow serialized 
to be presented in nREPL client. And easiest thing to do (for now) is to serialize it as a string via `pr-str`.

As you can imagine this can be done many ways. We will explore the most popular piggieback+weasel solution in the next section.

```
   ┌────────────────────┐
  ┌┤      Browser       ├─────────────────────────────────────────┐
  │└────────────────────┘                                         │
  │ ─ Javascript execution context─ ─                             │
  ││                                 │                            │
  │                                                               │
  ││                                 │                            │
  │         cljs app                                              │
  ││   runtime environment   ■       │                            │
  │                          │                                    │
  ││                         │       │                            │
  │  ┌───────────────────┐   │                                    │
  ││ │ ┌──▶ Listen  ◀────┤   │       │                            │
  │  │ │    EvalJS  ─────┼───┘                                    │
  ││ │ │    pr-str       │           │                            │
  │  │ │    Reply   ─────┼─┐                                      │
  ││ │ └─── Loop         │ │         │                            │
  │  │       ┌───────────┤ │                                      │
  ││ └───────┤   Slave   │ │         │                            │
  │ ─ ─ ─ ─ ─└───────────┤─│─ ─ ─ ─ ─                             │
  └──────────────────────┼─┼──────────────────────────────────────┘
                         │ │
                         │ │
                       network
                     websockets
                         │ │
   ┌────────────────────┐│ │
  ┌┤    JVM process     ├┼─┼──────────────────────────────────────────────────┐
  │└────────────────────┘│ │                                                  │
  │┌ ─Java/Clojure state ┼ ┼ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐│
  │                      │ │ ┌─ ── ── ── ── ── ── ── ── ── ── ── ── ── ── ─┐  │
  ││                     │ │       ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐   ││
  │                      │ │ │            ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─    │  │
  ││                     │ │ │     │                                   │ │ │ ││
  │    eval-cljs ────────┘ │              │                                   │
  ││   -> string result ◀──┘ │     │           ■  ClojureScript        │ │ │ ││
  │                          │            │    │  compiler state           │  │
  ││   build-cljs    ──────────────┼───────────┘                       │ │   ││
  │    -> string             │            │                                │  │
  ││                         │     │       ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │ │ ││
  │    compile-clj   ───────────────────┐                                     │
  ││   -> bytecode           │     │    │                                │ │ ││
  │                          │          ■  Clojure compiler state          │  │
  ││   eval-bytecode ──────────┐   └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘   ││
  │    -> (pr-str result)    │ │                                           │  │
  ││                         │ │                                           │ ││
  │                            └───────────■  session state                   │
  ││                         └─ ── ── ── ── ── ── ── ── ── ── ── ── ── ── ─┘ ││
  │                                                                           │
  ││                                                                         ││
  │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
  └───────────────────────────────────────────────────────────────────────────┘
```

## Piggieback + Weasel

[Piggieback](https://github.com/cemerick/piggieback) is the master and [Weasel](https://github.com/tomjakubowski/weasel) is the slave.

Piggieback is a well-known nREPL middleware which adds support for ClojureScript
evaluation. Instead of introducing a new protocol it hijacks 'ieval' middleware. 
I assume this was done as a quick hack to get basic ClojureScript REPL going
and to avoid the need for teaching existing nREPL clients new protocol. 
So it just emulates selected nREPL message related to Clojure REPL evaluation.
It is implemented with several clever tricks and nasty hacks to 
drive CLJS REPL which in turn sends Javascript to Weasel in the browser. All that 
while juggling global state between sessions on multiple threads.

Also here comes the ritual of first starting with normal Clojure REPL
and then "booting" into ClojureScript REPL. If you look at the diagram below
you can see that piggieback depends on deliberate order of middleware:

1. session
2. piggieback
3. ieval

Initially Piggieback ignores all messages, so they fall-through to 'ieval' (Clojure).
When some magic happens and Piggieback is started and successfully connected to Weasel
it starts intercepting 'eval' and 'load-file' nREPL messages and processing
them in ClojureScript-mode. When it detects ":cljs/quit", it drops ClojureScript-related 
state and returns back to passthrough-mode.

```
   ┌────────────────────┐
  ┌┤      Browser       ├─────────────────────────────────────────┐
  │└────────────────────┘                                         │
  │ ─ Javascript execution context─ ┐                             │
  ││                                                              │
  │                                 │                             │
  ││                                                              │
  │         cljs app                │                             │
  ││   runtime environment   ■                                    │
  │                          │      │                             │
  ││                         │                                    │
  │  ┌───────────────────┐   │      │                             │
  ││ │ ┌──▶ Listen       │   │                                    │
  │  │ │    EvalJS  ─────┼───┘      │                             │
  ││ │ │    pr-str       │                                        │
  │  │ │    Reply        │          │                             │
  ││ │ └─── Loop         │                                        │
  │  │       ┌───────────┤          │                             │    network
  ││ └───────┤  Weasel   │◀───────────────────────────────────────┼──websockets──┐
  │ ─ ─ ─ ─ ─└───────────┘─ ─ ─ ─ ─ ┘                             │              │
  └───────────────────────────────────────────────────────────────┘              │
                                                                                 │
                                                                                 │
                                                                                 │
   ┌────────────────────┐                                                        │
  ┌┤    JVM process     ├─────────────────────────────────────────────────────┐  │
  │└────────────────────┘                                                     │  │
  │┌ ─Java/Clojure state ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐│  │
  │                                                                           │  │
  ││                                                                         ││  │
  │  ┌─────────────────────────────────────────────────────────────────────┐  │  │
  ││ │                                  ┌─ ── ── ── ── ── ── ─┐            │ ││  │
  │  │                                    ┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐              │  │  │
  ││ │                                  │   ■  compiler1      │   ...      │ ││  │
  │  │                                  │ └ ┼ ─ ─ ─ ─ ─ ─ ─ ┘ │            │  │  │
  ││ │                                      │  session1                    │ ││  │
  │  │                                  └─ ─┼ ── ── ── ── ── ─┘            │  │  │
  ││ │                                      │      ▲                       │ ││  │
  │  │                                ┌─────┼──────┘ selection             │  │  │
  ││ │                                │     │                              │ ││  │
  │  │ ┌──▶ Listen                    │     │                              │  │  │
  ││ │ │                              │     │                              │ ││  │
  │  │ │    Handle ──┐ * session  ────┘     ▼                              │  │  │
  ││ │ │             │ * piggieback ─▶ build-cljs ─▶ eval-cljs  ◀──────────┼─┼┼──┘
  │  │ │             │ * ieval                            │                │  │
  ││ │ └─── Loop ◀───┘ * ...   ◀──────────────────────────┘                │ ││
  │  │                                                     ┌──────────────┐│  │
  ││ └─────────────────────────────────────────────────────┤ nREPL server ├┘ ││
  │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─└───────▲──────┴ ─ │
  └────────────────────────────────────────────────────────────────┼──────────┘
                                                                   │
                                                                network
                                                                TCP/IP
                                                                   │
                                                                   │
                                                           ┌───────────────┐
                                                           │ nREPL client1 │   ...
                                                           └───────────────┘

```

## Dirac

Dirac is a DevTools fork with accompanied ClojureScript runtime library and nREPL middleware. 

The main goal of Dirac is to provide sane ClojureScript REPL in the browser.
To implement this properly we have to jump through hoops.

First, please realize that there are two Javascript contexts in the browser. 
The first one is our CLJS app (target runtime environment) and the second one is running Dirac DevTools. 
Dirac DevTools is using Chrome debugger protocol to connect back to Chrome browser instance to debug/instrument our app.

Please observe following key properties:

1. Piggieback middleware was replaced with Dirac middleware (but uses the same tricks)
2. Weasel-like slave is implemented inside DevTools (not in app context)
2. nREPL client is implemented inside DevTools
4. app context contains Dirac runtime and cljs-devtools (optional)
5. Dirac Agent runs in the same JVM as our nREPL server (optional)

Unfortunately, we cannot easily implement standard nREPL client directly in Dirac DevTools.
First, we don't have real sockets API, we can use only websockets from Javascript.
Second, we don't have libraries like bencode or clojure.tools.nrepl on Javascript side.
To implement full nREPL client, we would have to re-implement them from scratch.

That is why I decided to implement a standalone server "Dirac Agent" which
acts as a tunnel between Dirac DevTools nREPL client and real nREPL server. 

```
 [ nREPL server]  <-s->  [ Dirac Agent ]  <-ws->  [ Dirac DevTools REPL ]
```

Tunnel allows one-to-many scenario, where multiple Dirac DevTools instances can connect to a singe Dirac Agent which talks
to a single nREPL server. Each Dirac DevTools instance is assigned its own nREPL session, so they can use a single nREPL
server and they don't step on each others' toes. Thanks to this you can open multiple pages with different Dirac DevTools
and they all can have their own independent REPLs.

So the multi-client scenario can look like this:
```
                                           <-ws->  [ nREPL tunnel client #1 ]
  [ nREPL server]  <-s->  [ Dirac Agent ]  <-ws->  [ nREPL tunnel client #2 ]
                                           <-ws->  [ nREPL tunnel client #3 ]
```

Having all moving parts of the system under our control, we can boot into ClojureScript REPL automatically.
When nREPL client connects to nREPL server and detects Dirac nREPL middleware presence it asks it 
to boot into ClojureScript automatically.

After booted, our Dirac middleware behaves similar to Piggieback. It intercepts 'eval' and 'load-file requests
and processes them in ClojureScript-mode.

Our Weasel-fork does not evaluate Javascript snippets directly, but requests evaluation from runtime using the debugger protocol.
Evaluated results are immediately printed to console (possibly via cljs-devtools), but runtime also 
constructs serialized reply using pr-str (for non-Dirac nREPL clients).
 
This has advantage that even if app's javascript context is paused on a breakpoint, our REPL interaction still works.
Dirac is able to evaluate ClojureScript code in the context of a paused breakpoint recognizing local variables, etc.

```
              ┌──debugger protocol / websockets───────────────────────────────────┐
              ▼                                                                   │
   ┌────────────────────┐                                                         │
  ┌┤      Browser       ├─────────────────────────────────────────────────────┐   │
  │└────────────────────┘                                                     │   │
  │ ─ Javascript execution context─ ┐     ─ Javascript execution context─ ─ ┐ │   │
  ││                                     │                                    │   │
  │            cljs app             │                                       │ │   │
  ││      runtime environment            │         Dirac DevTools fork  ──────┼───┘
  │                                 │                                       │ │
  ││             ┌────────────────┐      │ ┌───────────┐ ┌────────────────┐   │
  │   ┌───■─────▶│ cljs-devtools  │─│─ ─ ─▶│Console/UI │ │  nREPL client  │◀┼─┼───┐
  ││  │   ▲      └────────────────┘      │ └───────────┘ └────────────────┘   │   │
  │   │   │      ┌────────────────┐ │                    ┌────────────────┐ │ │   │
  ││  │   │      │                │      │               │   Listen    ◀─┐│   │   │
  │   │   └──────┼── EvalJS  ◀────┼─┼────────────────────┼── RequestEval ││ │ │   │
  ││  └──────────┼──▶pr-str  ─────┼──────┼───────────────┼─▶ Reply       ││   │   │
  │              │                │ │                    │   Loop      ──┘│ │ │   │
  ││             │                │      │               │                │   │   │
  │              │┌───────────────┤ │                    │  ┌─────────────┤ │ │   │
  ││             └┤ Dirac runtime │      │               └──┤ Weasel-fork │◀──┼─┐ │
  │ ─ ─ ─ ─ ─ ─ ─ ┴───────────────┴ ┘     ─ ─ ─ ─ ─ ─ ─ ─ ─ ┴─────────────┴ ┘ │ │ │
  └───────────────────────────────────────────────────────────────────────────┘ │ │
                                                                                │ │
                                                                              network
                                                                            websockets
                                                                                │ │
   ┌────────────────────┐                                                       │ │
  ┌┤    JVM process     ├─────────────────────────────────────────────────────┐ │ │
  │└────────────────────┘                                                     │ │ │
  │┌ ─Java/Clojure state ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐│ │ │
  │                                                                           │ │ │
  ││                                                                         ││ │ │
  │  ┌─────────────────────────────────────────────────────────────────────┐  │ │ │
  ││ │                                  ┌─ ── ── ── ── ── ── ─┐            │ ││ │ │
  │  │                                    ┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐              │  │ │ │
  ││ │                                  │   ■  compiler1      │   ...      │ ││ │ │
  │  │                                  │ └ ┼ ─ ─ ─ ─ ─ ─ ─ ┘ │            │  │ │ │
  ││ │                                      │  session1                    │ ││ │ │
  │  │                                  └─ ─┼ ── ── ── ── ── ─┘            │  │ │ │
  ││ │                                      │      ▲                       │ ││ │ │
  │  │                                ┌─────┼──────┘ selection             │  │ │ │
  ││ │                                │     │                              │ ││ │ │
  │  │ ┌──▶ Listen                    │     │                              │  │ │ │
  ││ │ │                              │     │                              │ ││ │ │
  │  │ │    Handle ──┐ * session  ────┘     ▼                              │  │ │ │
  ││ │ │             │ * dirac    ───▶ build-cljs ─▶ eval-cljs  ◀──────────┼─┼┼─┘ │
  │  │ │             │ * ieval                            │                │  │   │
  ││ │ └─── Loop ◀───┘ * ...   ◀──────────────────────────┘                │ ││   │
  │  │                                                     ┌──────────────┐│  │   │
  ││ └─────────────────────────────────────────────────────┤ nREPL server ├┘ ││   │
  │                                                        └──────────────┘   │   │
  ││                                                               ▲         ││   │
  │                                                                │TCP/IP    │   │
  ││                                                               ▼         ││   │
  │                                                        ┌──────────────┐   │   │
  ││                                                       │ Dirac Agent  │◀─┼┼───┘
  │                                                        └──────────────┘   │
  ││                                                                         ││
  │                                                                           │
  │└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘│
  └───────────────────────────────────────────────────────────────────────────┘
```

## Figwheel

[Figwheel](https://github.com/bhauman/lein-figwheel) is a popular build tool which is capable of code hot-reloading (among other great features).

Most people interface with high-level build tool implemented as a Leiningen plugin.

But Figwheel is internally split into multiple independent components:

1. Figwheel sidecar is a server-side component living in a JVM
2. Figwheel support is a slave injected as supporting runtime into a page/app
3. Figwheel plugin is Leiningen plugin providing high-level tools and instrumenting other components 

In a nutshell Figwheel sidecar runs a file-system watching loop:

1. when file modifications are detected 
    2. determine what needs to be recompiled
    3. use ClojureScript library to re-build affected namespaces
    4. send Javascript files to the browser for hot-code swapping
 
Figwheel supports multiple "builds", each given own id and configured independently.

For this to work well, Figwheel has to maintain and juggle ClojureScript compiler state
in a similar way how nREPL session middleware with Piggieback has to keep track of
 independent compiler states for separate sessions.

In the diagram below you can see the overall idea. Please note the list of compilers inside Figwheel sidecar.

```
   ┌────────────────────┐
  ┌┤      Browser       ├─────────────────────────────────────────────────────┐
  │└────────────────────┘                                                     │
  │ ─ Javascript execution context─ ─ ─ ─ ─                                   │
  ││                                       │                                  │
  │    ■       cljs app                                                       │
  ││   │  runtime environment              │                                  │
  │    │                                                                      │
  ││   │                                   │                                  │
  │    │                                                                      │
  ││   │  ┌───────────────────┐            │                                  │
  │    │  │  Listen ◀─┐       │                                               │
  ││   └──┼─ EvalJS   │       │            │                                  │
  │       │  ...      │       │                                               │
  ││      │  Loop   ──┘       │            │                                  │
  │       │                   │                                               │
  ││      │  ┌────────────────┤            │                                  │
  │       └──┤Figwheel support│◀────┐                                         │
  ││         └────────────────┘     │      │                                  │
  │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─                                   │
  └─────────────────────────────────┼─────────────────────────────────────────┘
                                    │
                                 network
                               websockets
                                    │
   ┌────────────────────┐           │
  ┌┤    JVM process     ├───────────┼─────────────────────────────────────────┐
  │└────────────────────┘           │                                         │
  │┌ ─Java/Clojure state ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐│
  │                                 │                                         │
  ││                                │                                        ││
  │                                 │                                         │
  ││                                │                                        ││
  │                                 │                                         │
  ││                                │                                        ││
  │                                 │                                         │
  ││                                │                                        ││
  │                                 │                                         │
  ││  ┌─────────────────────┐       │                                        ││
  │  ┌┤  Figwheel sidecar   ├───────┼──────────────────────────────────────┐  │
  ││ │└─────────────────────┘       │    ┌─ ── ── ── ── ── ── ─┐           │ ││
  │  │ ┌─▶ ListenFS                 │      ┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐             │  │
  ││ │ │   Rebuild  ──▶ build-cljs ◀┼────┼───■  compiler1      │   ...     │ ││
  │  │ │   Hotload  ──▶ eval-cljs ◀─┘    │ └ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │           │  │
  ││ │ └── Loop                                build-id #1                 │ ││
  │  │                                   └─ ── ── ── ── ── ── ─┘           │  │
  ││ └─────────────────────────────────────────────────────────────────────┘ ││
  │                                                                           │
  ││                                                                         ││
  │                                                                           │
  ││                                                                         ││
  │                                                                           │
  ││                                                                         ││
  │                                                                           │
  ││                                                                         ││
  │                                                                           │
  ││                                                                         ││
  │                                                                           │
  │└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘│
  └───────────────────────────────────────────────────────────────────────────┘
```

## Dirac + Figwheel

Figwheel provides its own REPL. There was a confusion among users how Dirac REPL and Figwheel REPL play together.

Dirac and Figwheel are complementary tools. But their REPLs are independent. 
I tend to use Figwheel only for hot-reloading, disable its REPL in favor of using Dirac REPL.

But there is a subtle problem. As you probably know traditionally you had to make effort to keep your REPL environment 
in-sync with your runtime environment being evolved by hot-reloading. Figwheel REPL has an advantage that it is using
the same compiler environment as was used for last incremental compilation. That means that Figwheel REPL is always in sync
and you don't have to 'load-file' or somehow reload/refresh namespaces in your REPL.

But Dirac can do better. With specific setup, Dirac is able to use Figwheel's compilers for REPL evaluations.
Dirac nREPL middleware looks for Figwheel sidecar presence. If Figwheel is present in the nREPL server,
Dirac is able to add his compilers to the list of known compilers to Dirac REPL. You can then switch between compilers
using `(dirac! :switch)` special REPL command.

TODO: link to documentation

Here is a schema of the full setup. Please note that we simply added Figwheel on top of Dirac configuration.
Figwheel support is present in app's runtime environment and Figwheel sidecar lives inside the same JVM instance
as our nREPL server (Dirac middleware).

```
              ┌──debugger protocol / websockets───────────────────────────────────┐
              ▼                                                                   │
   ┌────────────────────┐                                                         │
  ┌┤      Browser       ├─────────────────────────────────────────────────────┐   │
  │└────────────────────┘                                                     │   │
  │ ─ Javascript execution context─ ┐     ─ Javascript execution context─ ─ ┐ │   │
  ││                                     │                                    │   │
  │            cljs app             │                                       │ │   │
  ││      runtime environment            │         Dirac DevTools fork  ──────┼───┘
  │                                 │                                       │ │
  ││             ┌────────────────┐      │ ┌───────────┐ ┌────────────────┐   │
  │   ┌───■─────▶│ cljs-devtools  │─│─ ─ ─▶│Console/UI │ │  nREPL client  │◀┼─┼───┐
  ││  │   ▲      └────────────────┘      │ └───────────┘ └────────────────┘   │   │
  │   │   │                         │                    ┌────────────────┐ │ │   │
  ││  │   │      ┌────────────────┐      │               │   Listen    ◀─┐│   │   │
  │   │   └──────┤     Dirac      │◀┼────────────────────┼── RequestEval ││ │ │   │
  ││  └─────────▶│    runtime     │──────┼───────────────┼─▶ Reply       ││   │   │
  │              └────────────────┘ │                    │   Loop      ──┘│ │ │   │
  ││             ┌────────────────┐      │               │                │   │   │
  │    ■─────────│Figwheel support│ │                    │  ┌─────────────┤ │ │   │
  ││             └────────────────┘      │               └──┤ Weasel-fork │◀──┼─┐ │
  │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ▲ ─ ─ ─ ─ ┘     ─ ─ ─ ─ ─ ─ ─ ─ ─ ┴─────────────┴ ┘ │ │ │
  └───────────────────────┼───────────────────────────────────────────────────┘ │ │
                          │                                                     │ │
                          └─network─┐                                         network
                          websockets│                                       websockets
                                    │                                           │ │
   ┌────────────────────┐           │                                           │ │
  ┌┤    JVM process     ├───────────┼─────────────────────────────────────────┐ │ │
  │└────────────────────┘           │                                         │ │ │
  │┌ ─Java/Clojure state ─ ─ ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐│ │ │
  │                                 │                                         │ │ │
  ││                                │                                        ││ │ │
  │  ┌──────────────────────────────┼──────────────────────────────────────┐  │ │ │
  ││ │                              │   ┌─ ── ── ── ── ── ── ─┐            │ ││ │ │
  │  │                              │     ┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐              │  │ │ │
  ││ │                              │   │   ■  compiler1      │   ...      │ ││ │ │
  │  │                              │   │ └ ┼ ─ ─ ─ ─ ─ ─ ─ ┘ │            │  │ │ │
  ││ │                              │       │  session1                    │ ││ │ │
  │  │                              │   └─ ─┼ ── ── ── ── ── ─┘            │  │ │ │
  ││ │                              │       │      ▲                       │ ││ │ │
  │  │                              │ ┌─────┼──────┘ selection             │  │ │ │
  ││ │                              │ │     │                              │ ││ │ │
  │  │ ┌──▶ Listen                  │ │     │                              │  │ │ │
  ││ │ │                            │ │     │                              │ ││ │ │
  │  │ │    Handle ──┐ * session  ──┼─┘     ▼                              │  │ │ │
  ││ │ │             │ * dirac    ──┼▶ build-cljs ─▶ eval-cljs  ◀──────────┼─┼┼─┘ │
  │  │ │             │ * ieval      │       ▲             │                │  │   │
  ││ │ └─── Loop ◀───┘ * ...   ◀────┼───────┼─────────────┘                │ ││   │
  │  │                              │       │              ┌──────────────┐│  │   │
  ││ └──────────────────────────────┼───────┼──────────────┤ nREPL server ├┘ ││   │
  │                                 │       │              └──────────────┘   │   │
  ││                                │       │                      ▲         ││   │
  │                                 │       │                      │TCP/IP    │   │
  ││                                │       │                      ▼         ││   │
  │                                 │       │              ┌──────────────┐   │   │
  ││                                │       │              │ Dirac Agent  │◀─┼┼───┘
  │                                 │       │              └──────────────┘   │
  ││                                │       │                                ││
  │   ┌─────────────────────┐       │       │                                 │
  ││ ┌┤  Figwheel sidecar   ├───────┼───────┼──────────────────────────────┐ ││
  │  │└─────────────────────┘       │   ┌─ ─┼ ── ── ── ── ── ─┐            │  │
  ││ │ ┌─▶ ListenFS                 │     ┌ ┼ ─ ─ ─ ─ ─ ─ ─ ┐              │ ││
  │  │ │   Rebuild  ──▶ build-cljs ◀┼───┼───■  compilerX      │   ...      │  │
  ││ │ │   Hotload  ──▶ eval-cljs ◀─┘   │ └ ─ ─ ─ ─ ─ ─ ─ ─ ┘ │            │ ││
  │  │ └── Loop                               build-id #1                  │  │
  ││ │                                  └─ ── ── ── ── ── ── ─┘            │ ││
  │  └─────────────────────────────────────────────────────────────────────┘  │
  ││                                                                         ││
  │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
  └───────────────────────────────────────────────────────────────────────────┘
  ```

Have fun!
