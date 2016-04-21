# Dirac DevTools Motivation

I spend most of my time developing web apps in ClojureScript and for debugging and page inspection I use Chrome DevTools.

I realized that a few possible DevTools tweaks would greatly improve my ClojureScript experience.
For example I wanted integrated ClojureScript REPL in DevTools Javascript Console - that would be a pretty huge deal for me.

### A bit of history

Chrome/Blink developers have been pretty open for adding extension points into their DevTools.

Introduction of [custom formatters](https://docs.google.com/document/d/1FTascZXT9cxfetuPRT2eXPQKXui4nWFivUnS_335T3U) in early 2015 was a great step forward.
This allowed to enhance presentation of ClojureScript values (data structures) directly in Javascript Console.
I implemented the [cljs-devtools](https://github.com/binaryage/cljs-devtools) library which leverages this feature.

In December of 2015 I had an idea of [integrating cljs-devtools with Figwheel's REPL console](https://github.com/bhauman/lein-figwheel/pull/309).
But this was not the first attempt to bring ClojureScript REPL functionality into Chrome DevTools. Actually Suprematic have implemented
their [ClojureScript REPL extension](http://blog.suprematic.net/2014/02/chrome-devtools-repl-for-clojurescript.html) in 2014.

The problem with Suprematic approach was usability. The trouble with extra panels is that they don't integrate well with existing panels.
They are separate web "apps" injected into DevTools UI. For best user experience the ClojureScript REPL should be very closely integrated with
Javascript Console.

Also I tried to [request a new extension point](https://code.google.com/p/chromium/issues/detail?id=484261) which would
potentially allow me to implement REPL functionality in a similar way how custom formatters are implemented.
Unfortunately existing DevTools extension APIs were not suitable for what I wanted to do.
There has been some progress made on that issue but after six months of waiting I decided to fork the DevTools.

### A divergent fork?

I don't have an ambition to merge this project upstream into official DevTools.
Dirac changes are too specific for ClojureScript (and mostly implemented in ClojureScript).
Instead, the idea is to maintain [a set of patches](https://github.com/binaryage/dirac/commit/devtools-diff) rolling on top of official DevTools branch
(and maintain [a battery of tests](https://github.com/binaryage/dirac/tree/master/test/browser/fixtures/src/tests/dirac/tests) to make sure the Dirac code does not break).

I also provide a [Chrome Extension](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi)
which wraps Dirac DevTools to make installation and life a bit easier for Dirac users. After initial setup, the experience should be very similar
to integrated DevTools - you just use a different keyboard shortcut to open it.

### It is an experimental ground

I view Dirac as an experimental ground where new DevTools features can be implemented in more relaxed way.
Not only for ClojureScript but maybe for other compile-to-js languages as well. It could serve as a proof-of-concept
implementation of some features or extension points requested or planned in the official DevTools.

In future, it might be eventually possible to implement some Dirac features directly in the DevTools.
But until then I decided to maintain a live fork so we don't have to beg Chrome developers to add experimental \
ClojureScript-related features into official DevTools for us.