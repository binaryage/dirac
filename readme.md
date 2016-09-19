# Dirac DevTools

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](license.txt) 
[![Clojars Project](https://img.shields.io/clojars/v/binaryage/dirac.svg)](https://clojars.org/binaryage/dirac) 
[![Travis](https://img.shields.io/travis/binaryage/dirac.svg)](https://travis-ci.org/binaryage/dirac) 
[![Sample Project](https://img.shields.io/badge/project-example-ff69b4.svg)](https://github.com/binaryage/dirac-sample) 
[![Chrome Extension](https://img.shields.io/badge/chrome-extension-ebb338.svg)](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi)

Dirac is a [Chrome DevTools][1] fork with extra features for ClojureScript developers.

**TOC** 
| **[Introduction](#introduction)**
| **[Screenshots](##screenshots)**
| **[Motivation](docs/motivation.md)**
| **[Installation](docs/installation.md)**
| **[Upgrading](docs/upgrading.md)**
| **[Configuration](docs/configuration.md)**
| **[Integration](docs/integration.md)**
| **[Example project](https://github.com/binaryage/dirac-sample)**
| **[FAQ](docs/faq.md)**

### Introduction

Dirac project maintains [a set of patches][2] rolling on top of official Chrome DevTools.
That means you don't lose any functionality, you just add ClojureScript support on top.
Additionally we provide [a Chrome Extension][3] which packages this enhanced DevTools version and hosts it within Chrome for convenient access.
Dirac DevTools can be just a keystroke away enabling following features:

  * ClojureScript-aware REPL integrated into DevTools Javascript console
    * can eval ClojureScript in the context of currently selected stack frame (when paused on a breakpoint)
    * ClojureScript [code completion suggestions][4] (like completions in Javascript console)
    * [Parinfer][5] goodness
    * adds a global keyboard shortcut for focusing the console prompt
  * enables [custom formatters][6] by default (for [cljs-devtools][7])
     * custom formatters are displayed inline on Source Panel (during debugging)
  * better [display of ClojureScript function names][8]
  * improved display of URLs
  * better display of ClojureScript property names:
    * macro-generated names are renamed to friendly names using sub-indexes
    * properties are grouped, the most important properties at top
      * properties with nice names go first
      * then macro-generated names
      * then null values
      * then undefined values

### Screenshots

![ClojureScript REPL][9]

<table>
<tr>
<td><a href="https://dl.dropboxusercontent.com/u/559047/dirac-general-completions.png"><img src="https://dl.dropboxusercontent.com/u/559047/dirac-general-completions.png"></a></td>
<td><a href="https://dl.dropboxusercontent.com/u/559047/dirac-ns-completions.png"><img src="https://dl.dropboxusercontent.com/u/559047/dirac-ns-completions.png"></a></td>
<td><a href="https://dl.dropboxusercontent.com/u/559047/dirac-js-completions.png"><img src="https://dl.dropboxusercontent.com/u/559047/dirac-js-completions.png"></a></td>
</tr>
</table>

[1]: https://developer.chrome.com/devtools
[2]: https://github.com/binaryage/dirac/commit/devtools-diff
[3]: https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi
[4]: https://github.com/binaryage/dirac/releases/tag/v0.4.0
[5]: https://shaunlebron.github.io/parinfer
[6]: https://docs.google.com/document/d/1FTascZXT9cxfetuPRT2eXPQKXui4nWFivUnS_335T3U
[7]: https://github.com/binaryage/cljs-devtools
[8]: https://dl.dropboxusercontent.com/u/559047/dirac-non-trivial-beautified-stack-trace.png
[9]: https://dl.dropboxusercontent.com/u/559047/dirac-main-01.png
