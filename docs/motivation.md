# Dirac DevTools Motivation

Currently I spend most of my time developing web apps on client side in ClojureScript.
And for page inspection and debugging I stay most of the time in the DevTools.
Over time I realized that a few possible DevTools tweaks would greatly improve my ClojureScript experience.
Especially integrating ClojureScript REPL into DevTools Javascript Console would be a pretty huge deal.

### A bit of history

Chrome/Blink developers have been pretty open for adding extensibility points to their DevTools platform.
This is not a first attempt to integrate a REPL into DevTools.
Traditionally one has been able to implement a Chrome extension which could register additional panels in Chrome DevTools.
Suprematic have implemented their [ClojureScript REPL extension](http://blog.suprematic.net/2014/02/chrome-devtools-repl-for-clojurescript_26.html) this way back in 2014.
Also more recently [React Developer Tools](https://github.com/facebook/react-devtools) used this approach.

The problem with extra panels is that that they don't integrate well with existing panels. They are separate islands. Separate web "apps" injected
into DevTools UI. IMO for best user experience the ClojureScript REPL should be very closely integrated with
Javascript Console. Ideally, there should be no switching between panels.

There was a big improvement by introduction of [custom formatters](https://docs.google.com/document/d/1FTascZXT9cxfetuPRT2eXPQKXui4nWFivUnS_335T3U) in early 2015.
This allowed to enhance presentation of ClojureScript values directly in Javascript Console.
I implemented the [cljs-devtools](https://github.com/binaryage/cljs-devtools) library which leverages this feature.

Also I have filled a [request for a new extension point](https://code.google.com/p/chromium/issues/detail?id=484261) which would
potentially allow me to implement REPL functionality in a similar way to custom formatters. Unfortunately existing DevTools extension
APIs weren't suitable for what I wanted to do. There has been some progress made on that issue but after six months of waiting I decided to fork the DevTools.

### A divergent fork?

I don't have an ambition to merge this project upstream into official DevTools.
Dirac changes are too specific for ClojureScript (and mostly implemented in ClojureScript).
Instead, the idea is to maintain a set of patches rolling on top of official DevTools branch.

Turns out, it is not that big deal at the end of the day. I also provide the [Dirac Chrome Extension](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi)
which wraps Dirac DevTools to make installation and life a bit easier for Dirac users. The experience should be very similar
to integrated DevTools - you just use a different keyboard shortcut to open it.

Also I view Dirac as an experimental test ground where new DevTools features can be implemented.
Not only for ClojureScript but maybe for other compile-to-js languages as well. It could serve as a proof-of-concept
implementation of some niche features or extension points requested or planned in the official DevTools.

In future some Dirac features could move into official DevTools eventually, because there could be a way how to implement
them using newly introduced extension points. But until then we want to maintain a live fork so we don't have to wait
for Chrome developers to add "our" requested features.