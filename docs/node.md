# Dirac DevTools and Node.js

It is possible to use Dirac for debugging a node.js process. This feature was introduced in Dirac 1.1.0. With [cljs-devtools
v0.9.0](https://github.com/binaryage/cljs-devtools/releases/tag/v0.9.0) it is possible to achieve similar ClojureScript 
debugging experience as under normal Chrome. 

### Initial setup

The basic idea is to instruct Dirac DevTools to connect to an external node.js debugger instead of internal Chrome debugger.

When you run `node --inspect app.js`, node should print something like:

```
Debugger listening on port 9229.
Warning: This is an experimental feature and could change at any time.
To start debugging, open the following URL in Chrome:
    chrome-devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=127.0.0.1:9229/919c3f53-2784-4120-848b-68416181e90f
```

This should tell you two important settings:
 
1. node.js debugger is running at `http://localhost:9229`
2. the debugger-id of your Javascript context is `919c3f53-2784-4120-848b-68416181e90f`

You have to set node.js debugger address into Dirac Extension Options as "Debugger URL":

<img src="https://box.binaryage.com/dirac-node-debugger-url-example.png" width="600" alt="node debugger">

The debugger-id of your Javascript context is detected automatically. In more complex scenario when you have multiple 
debuggable Javascript contexts running inside your node.js process, you might specify `ws=919c3f53-2784-4120-848b-68416181e90f`
 into "Extra frontend URL params". This will override the auto-detection.

### Example project

You can follow [example project](https://github.com/binaryage/dirac/tree/master/examples/leiningen) project.

1. first, make sure that your [Dirac installation](installation.md) works for classic browser debugging, 
2. instead `lein demo`, run `lein demo-node`, this should start an [example node app](https://github.com/binaryage/dirac-sample/blob/master/src/demo-node/dirac_sample/demo.cljs)
3. set `http://localhost:9229` as "Debugger URL" in Dirac Extension Options
4. click the Dirac extension button on any page, Dirac DevTools should 
   1. connect to your node.js process 
   2. attach the available node.js context 
   3. and open DevTools with limited features (only Console, Sources, Memory and Profiler panels)
   4. also you should see Console with "Node.js Main Context" as the only available option in context combo
5. you should be able to switch to ClojureScript REPL and use Dirac as usual
6. you can hit ENTER in your `lein demo-node` terminal session, to stop on a breakpoint and exercise Dirac features 

### Possible issues

##### Source maps

ClojureScript properly generates source maps, but under `:target` `:nodejs` they are linked via file-system paths.
Normally node.js can see file-system paths so source mapping works internally (e.g. stack traces reported by node.js), 
The problem is that DevTools is a web app and cannot directly access file-system source maps references. I worked around it 
in dirac-sample by using a separate web-server just to serve source maps to DevTools. That [can be achieved](https://github.com/binaryage/dirac-sample/blob/06321f53a34db73c1e9165c2b355e6e20b65ed14/project.clj#L86) via ClojureScript
compiler option `:source-map-asset-path` and pointing it to the source-maps server.

Also please note that the current ClojureScript 1.9.293 does not always respect this option and can generate some files
as if this option was not set. Dirac will complain about internal errors with source maps. This seems to be fixed in current master, 
so this problem will likely go away in next release.

##### Node.js version

Dirac DevTools is built from latest Chromium sources. This can potentially [cause issues](faq.md#why-should-i-use-recent-chrome-canary-with-dirac-devtools) 
when using older Chrome due to debugger protocol changes. Similar concerns apply to node.js. Your node.js process
must be using similar debugging protocol to Dirac DevTools you happen to be using. In case of troubles try to run against 
[node.js nightly builds](https://nodejs.org/download/nightly) or [downgrade Dirac](faq.md#how-do-i-stick-to-a-particular-dirac-version) to a matching version.

##### REPL evaluation seems to work only on stopped debugger
  
This might be related to node.js debugger protocol implementation. They might not allow custom evaluations while message
 loop is live.
  
TODO: needs investigation.

---

I consider this feature very experimental. Please report bugs [here](https://github.com/binaryage/dirac/issues/31). Good luck!
