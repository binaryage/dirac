# Dirac DevTools Configuration

[Installation instructions](installation.md) rely on default settings.
Depending on your setup you might need to provide a custom config.

There are three areas where custom configuration can be provided:

1. Dirac Agent
2. Dirac nREPL middleware (a config inside nREPL server)
3. Dirac Runtime (a page-specific config)

In general, a configuration can originate in different places:

1. hard-coded defaults
2. environment
3. a config map provided as an argument to a function call

Configuration options from later override settings from previous.

Environmental variables have always a "DIRAC" prefix and are named after corresponding option key in the hard-coded defaults config map.
We use the [environ library](https://github.com/weavejester/environ) for reading environmental settings, so you have multiple ways how to define them:

1. environmental variables
2. Java system properties
3. `.lein-env` file.

You can for example use `lein-environ` plugin to specify environmental variables directly in your `project.clj`
(or alternatively `lein-boot` for boot scenario).

Please refer to [environ docs](https://github.com/weavejester/environ) for further info.

##### Dirac Agent configuration

Please consult [this file](https://github.com/binaryage/dirac/blob/master/src/agent/dirac/agent/config.clj) for possible
defaults and their environmental counterparts.

If you call [`dirac.agent/boot!`](https://github.com/binaryage/dirac/blob/master/src/agent/dirac/agent.clj) from code,
 you can override config options with a config map specified as an argument. Actually this is what
 [`dirac.agent-cli`](https://github.com/binaryage/dirac/blob/master/src/agent/dirac/agent_cli.clj) does by reading
command-line arguments and converting some of them to specific config keys.

##### Dirac nREPL middleware configuration

Please consult [this file](https://github.com/binaryage/dirac/blob/master/src/nrepl/dirac/nrepl/config.clj) for possible
defaults and their environmental counterparts.

##### Dirac Runtime - page-specific configuration

When you open/refresh Dirac DevTools it asks the current page for effective runtime page-specific config
(see [`dirac.runtime.repl/get-effective-config`](https://github.com/binaryage/dirac/blob/master/src/runtime/dirac/runtime/repl.cljs).
The most important setting is the connection info for Dirac Agent. This allows flexibility of configuring individual
ClojureScript projects with their own settings instead of providing one system-wide configuration. In theory
you could have different projects connecting do different Dirac Agents (which are connected to different nREPL servers).

Please consult [this file](https://github.com/binaryage/dirac/blob/master/src/runtime/dirac/runtime/prefs.cljs) for possible
defaults and their environmental counterparts.

##### Figwheel build configuration

As of May 2016, [Chrome doesn't reload sourcemaps when JavaScript is dynamically reloaded](https://bugs.chromium.org/p/chromium/issues/detail?id=438251). If you are using Figwheel to live reload your ClojureScript project, then the sourcemaps the browser uses will be out of sync with the JavaScript that is running, leading to very confusing debugging behaviour. The fix is simple: add [`:source-map-timestamp true`](https://github.com/clojure/clojurescript/wiki/Compiler-Options#source-map-timestamp) to your ClojureScript compiler options. This will bust the cache Chrome uses when caching source maps. For example:

```clj
:cljsbuild {:builds [{:id           "dev"
                      :source-paths ["src"]
                      :compiler     { ; other options elided
                                     :source-map      true
                                     :source-map-timestamp true}}
```

This configuration won't be needed if [lein-figwheel#386](https://github.com/bhauman/lein-figwheel/issues/386) is fixed. This configuration is only needed for build configurations you use to run Figwheel.
