# Dirac DevTools Motivation

I use Chrome DevTools a lot when developing ClojureScript web applications.

I realized that a few possible DevTools tweaks would greatly improve my ClojureScript experience.
For example I wanted to have integrated ClojureScript REPL directly in DevTools Javascript Console.

### A bit of history

Chrome/Blink developers have been pretty open for adding extension points into their DevTools.

Introduction of [custom formatters](https://docs.google.com/document/d/1FTascZXT9cxfetuPRT2eXPQKXui4nWFivUnS_335T3U) in early 2015 was a great step forward.
This allowed to enhance presentation of ClojureScript values (data structures) directly in Javascript Console.
I implemented [cljs-devtools](https://github.com/binaryage/cljs-devtools) library which leverages this feature.

In December 2015 I had an idea of [integrating cljs-devtools with Figwheel's REPL console](https://github.com/bhauman/lein-figwheel/pull/309).
But this was not the first attempt to bring ClojureScript REPL functionality into Chrome DevTools. Actually Suprematic have implemented
their [ClojureScript REPL extension](http://blog.suprematic.net/2014/02/chrome-devtools-repl-for-clojurescript.html) in 2014.

The problem with Suprematic approach for me was usability, because their REPL console was implemented as a separate extra panel.
I think ClojureScript REPL should be very closely integrated with existing Javascript console. Messages from both Javascript
REPL and ClojureScript REPL should be displayed together in one console.

I tried to [request a new extension point](https://code.google.com/p/chromium/issues/detail?id=484261) which would
potentially allow me to implement REPL functionality in a similar way how custom formatters are implemented.
Unfortunately existing DevTools extension APIs had not been suitable for what I wanted to do.
There had been some progress made on that issue but after six months of waiting I decided to fork the DevTools.

### A divergent fork?

I don't have an ambition to merge this project upstream into official DevTools.
Dirac changes are too specific for ClojureScript (and mostly implemented in ClojureScript).
Instead, the idea is to maintain [a set of patches](https://github.com/binaryage/dirac/commit/devtools-diff) rolling on top of official DevTools branch
(and to maintain [a battery of tests](https://github.com/binaryage/dirac/tree/master/test/browser) to make sure that the Dirac code does not break).

I also provide [a Chrome Extension](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi)
which wraps Dirac DevTools to make life a bit easier for Dirac users.
After [initial setup](installation.md), the experience should be very similar to integrated DevTools - you just use a different keyboard shortcut to open it.

### It is an experimental ground

I view Dirac as an experimental ground where new DevTools features can be implemented in more relaxed way.
Not only for ClojureScript but maybe for other compile-to-js languages as well. It could serve as a proof-of-concept
implementation of some features requested in the official DevTools.

In future, it might be eventually possible to implement some Dirac features directly in the DevTools.
But until then I decided to maintain a live fork so we don't have to beg Chrome developers to add
ClojureScript-related features into official DevTools for us.