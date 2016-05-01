# Dirac DevTools Configuration

[Installation instructions](install.md) rely on sane default settings.
Depending on your setup you might need to provide a custom configuration.

There are three areas where custom configuration can be provided:

1. Dirac Agent
2. Dirac nREPL middleware
3. Dirac Runtime - page-specific configuration

In general, the configuration can come from different sources:

1. hard-coded defaults
2. environment
3. a config map provided as an argument

Configuration options from later source override settings from previous sources.

Environmental variables have always prefix "DIRAC" and are named after corresponding option key in the hard-coded defaults config map.
We use [environ library](https://github.com/weavejester/environ) for reading environmental settings, so you have multiple ways how to define them:

1. environmental variables
2. Java system properties
3. `.lein-env` file.

You can for example use `lein-environ` plugin to specify environmental variables directly in your `project.clj` or alternatively `lein-boot` for boot scenario.

Please refer to [environ docs](https://github.com/weavejester/environ) for further info.

##### Dirac Agent configuration

Please consult [this file](https://github.com/binaryage/dirac/blob/master/src/agent/dirac/agent/config.clj) for possible
defaults and their environmental counterparts.

If you invoke [`dirac.agent/boot!`](https://github.com/binaryage/dirac/blob/master/src/agent/dirac/agent.clj) from code
 you can override config options with a config map specified as an argument. Actually this is what
 [`dirac.agent-cli`](https://github.com/binaryage/dirac/blob/master/src/agent/dirac/agent_cli.clj) does by reading
command-line arguments and converting some of them to config options.

##### Dirac nREPL middleware configuration

Please consult [this file](https://github.com/binaryage/dirac/blob/master/src/nrepl/dirac/nrepl/config.clj) for possible
defaults and their environmental counterparts.

##### Dirac Runtime - page-specific configuration

When you open/refresh Dirac DevTools it asks current page for effective runtime page-specific Dirac config
(see [`dirac.runtime.repl/get-effective-config`](https://github.com/binaryage/dirac/blob/master/src/runtime/dirac/runtime/repl.cljs).
The most important setting is a connection info for Dirac Agent. This allows flexibility of configuring individual
ClojureScript projects with their own settings instead of providing one system-wide configuration. In theory
you can have different projects connecting do different Dirac Agents (which are connected to different nREPL servers).

Please consult [this file](https://github.com/binaryage/dirac/blob/master/src/runtime/dirac/runtime/prefs.cljs) for possible
defaults and their environmental counterparts.