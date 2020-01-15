# Dirac DevTools

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](license.txt) 
[![Clojars Project](https://img.shields.io/clojars/v/binaryage/dirac.svg)](https://clojars.org/binaryage/dirac) 
[![Travis](https://img.shields.io/travis/binaryage/dirac/master.svg)](https://travis-ci.org/binaryage/dirac) 
[![Examples](https://img.shields.io/badge/project-examples-ff69b4.svg)](https://github.com/binaryage/dirac/tree/master/examples) 
[![Chrome Extension](https://img.shields.io/badge/chrome-extension-ebb338.svg)](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi)

Dirac is a flavored [Chrome DevTools][1] with extra tweaks for [ClojureScript](https://clojurescript.org) developers.

**DOC** 
: **[Motivation](docs/motivation.md)**
| **[Installation](docs/installation.md)**
| **[Configuration](docs/configuration.md)**
| **[Integration](docs/integration.md)**
| **[Examples](https://github.com/binaryage/dirac/tree/master/examples)**
| **[FAQ](docs/faq.md)**

### Quick start

1. install [the command-line tool](docs/cli.md)
1. run `dirac` and wait for Chrome to launch
1. in Chrome navigate away from "chrome://welcome" to some normal page, e.g. [https://clojurescript.org](https://clojurescript.org)
1. in Chrome open DevTools (CTRL+SHIFT+I or CMD+OPT+I on a Mac)
1. in DevTools switch to Console => Dirac prompt should enter `dirac.playground` and let you type in cljs code
1. in Console enter `(js/console.log (str "Hello" \space "Dirac!"))`

### Introduction

Dirac project maintains [a set of patches][2] rolling on top of official Chrome DevTools.
That means you don't lose any functionality, you just sprinkle cljs enhancements on top. Additionally we 
provide [a command-line tool](docs/cli.md) which allows you to launch Chrome with Dirac swapped in place of normal DevTools.

  * enables [custom formatters][6] by default (for [cljs-devtools][7])
     * custom formatters are displayed inline on Source Panel (during debugging)
  * better [display of cljs function names][8]
  * better display of cljs property names:
    * macro-generated names are renamed to friendly names using sub-indexes
    * properties are grouped, most important properties go first
  * REPL integrated into DevTools Console
    * eval cljs code in the context of currently selected stack frame (when paused on a breakpoint)
    * cljs [code completion suggestions][4] (like completions in Javascript console)
    * [Parinfer][5] goodness
  * initialized [blackboxing patterns](https://developer.chrome.com/devtools/docs/blackboxing) of cljs core libraries for 
    better stack-trace experience

### Screenshots

![ClojureScript REPL][9]

<table>
<tr>
<td><a href="https://box.binaryage.com/dirac-general-completions.png"><img src="https://box.binaryage.com/dirac-general-completions.png" alt="general completions"></a></td>
<td><a href="https://box.binaryage.com/dirac-ns-completions.png"><img src="https://box.binaryage.com/dirac-ns-completions.png" alt="namespace completions"></a></td>
<td><a href="https://box.binaryage.com/dirac-js-completions.png"><img src="https://box.binaryage.com/dirac-js-completions.png" alt="js completions"></a></td>
</tr>
</table>

[1]: https://developer.chrome.com/devtools
[2]: https://github.com/binaryage/dirac/commit/devtools-diff
[4]: https://github.com/binaryage/dirac/releases/tag/v0.4.0
[5]: https://shaunlebron.github.io/parinfer
[6]: https://docs.google.com/document/d/1FTascZXT9cxfetuPRT2eXPQKXui4nWFivUnS_335T3U
[7]: https://github.com/binaryage/cljs-devtools
[8]: https://box.binaryage.com/dirac-non-trivial-beautified-stack-trace.png
[9]: https://box.binaryage.com/dirac-main-01.png
