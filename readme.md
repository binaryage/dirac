# Dirac [![GitHub license](https://img.shields.io/github/license/binaryage/dirac.svg)](license.txt) [![Clojars Project](https://img.shields.io/clojars/v/binaryage/dirac.svg)](https://clojars.org/binaryage/dirac) [![Travis](https://img.shields.io/travis/binaryage/dirac.svg)](https://travis-ci.org/binaryage/dirac) [![Sample Project](https://img.shields.io/badge/project-example-ff69b4.svg)](https://github.com/binaryage/dirac-sample)

Dirac is a [Chrome DevTools](https://developer.chrome.com/devtools) fork with extra features to aid development in ClojureScript.

#### Features

  * REPL integrated into DevTools Javascript console
    * can eval ClojureScript in the context of currently selected stack frame (activated breakpoint)
    * [Parinfer](https://shaunlebron.github.io/parinfer) goodness
    * global keyboard shortcut for focusing the console prompt
  * custom formatters enabled by default (for [cljs-devtools](https://github.com/binaryage/cljs-devtools))
  * custom formatters are displayed inline in Source panel during debugging
  * 'Object Properties' better display ClojureScript properties:
    * macro-generated names are renamed to friendly names using sub-indexes
    * properties are grouped, the most important properties at the top
      * properties with nice names go first
      * then macro-generated names
      * then null values
      * then undefined values

![ClojureScript REPL](https://dl.dropboxusercontent.com/u/559047/dirac-repl-01.png)

#### Documentation

  * **[Motivation](docs/motivation.md)**
  * **[Installation](docs/installation.md)**
  * **[Configuration](docs/configuration.md)**
  * **[Integration](docs/integration.md)**
  * **[Example project](https://github.com/binaryage/dirac-sample)**
  * **[FAQ](docs/faq.md)**
