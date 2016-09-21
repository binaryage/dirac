# Dirac DevTools FAQ

### Why should I use recent Chrome Canary with Dirac DevTools?

Please note that DevTools has two parts.

1. DevTools "frontend" is a single-page web application (this is the UI you can see)
2. DevTools "backend" is a set of APIs in Chrome providing various services to the DevTools frontend over a websocket connection (see [remote debugging protocol](https://developer.chrome.com/devtools/docs/debugger-protocol)).

As you can imagine those APIs are in constant evolution. This is normally not a problem because internal DevTools frontend is bundled with Chrome so it is guaranteed that it talks to a matching backend.

When you use your own version of DevTools frontend and connect it to an arbitrary Chrome (backend) better make sure that the Chrome is of similar "age".
It might work but it is not guaranteed. DevTools developers have some anti-fragility system in place which allows detection of available APIs, so that
DevTools frontend can adapt dynamically and does not fatally break when used with a slightly different Chrome version.
But you should not use "too old" DevTools with "too recent" Chrome and vice versa.
Such combinations are not tested and are likely to break because fundamental APIs could be missing / changed on either side.

Since [Dirac v0.6.4](https://github.com/binaryage/dirac/releases/tag/v0.6.4) this requirement was relaxed because Dirac can newly use protocol definitions from internal DevTools. 
But still you should not diverge too far from recommended Chrome version.

My goal is to be releasing Dirac DevTools updates at least once a month to match it with recent Chrome Canary builds.

### How do I open Dirac DevTools via a keyboard shortcut?

By default, `CMD+SHIFT+I` under Mac and `CTRL+SHIFT+I` under Win.
You can assign a new shortcut via `chrome://extensions` -> `Keyboard shortcuts`

### How do I focus Dirac REPL prompt via a keyboard shortcut?

It is handy to bind a global keyboard shortcut to focus your Dirac REPL.
You must do this manually via `chrome://extensions` -> `Keyboard shortcuts` due to Chrome security reasons.
Ideally (with multi-monitor setup) your always-present Dirac REPL session will be just one keystroke away
from your code editor or any other app.

This is my setup under Mac, note the "Global" selection for "Focus Console Prompt":
<a href="https://dl.dropboxusercontent.com/u/559047/dirac-global-shortcuts.png"><img src="https://dl.dropboxusercontent.com/u/559047/dirac-global-shortcuts.png" width="800px"></a>

### Why can't I dock Dirac DevTools inside my Chrome window?

The docking API is only available for the embedded (internal) DevTools that come with Chrome.
See [the issue #5](https://github.com/binaryage/dirac/issues/5) for more details.

### Does Dirac play well with Figwheel?

Absolutely! Figwheel is fantastic. Just keep in mind that Figwheel's REPL is completely separate from your nREPL connected with Dirac
Agent. I usually tend to [disable Figwheel's REPL feature](https://github.com/binaryage/dirac-sample/blob/cfa695c6a1ec6ec6fac3815eec48f65da58fd959/project.clj#L111)
in my projects and use Figwheel just as a hot code/css reloader + HUD display for compilation feedback. Figwheel's REPL is an
extra feature which is not required for core Figwheel functionality.

### Why my project needs working source maps and no optimizations?

Dirac's code completion relies on source maps and the fact that project structure does not get transformed.
Dirac can get access to all your namespace source files loaded in the browser and
has enough runtime info about the project structure.

### My macros are not provided by code completion, what went wrong?

Dirac uses only client-side information to collect code-completion information. It works well with normal namespaces, but
macros are fundamentally compile-time thing. Dirac cannot see them
unless some information about macros gets "exported" to the client-side somehow.

Good news is that Dirac can read all `ns` forms in your project (in dev mode with no optimizations and working source maps).
When you mention a macro namespace in a `:require-macros` of some `ns` form or reference some symbols from a macro namespace
using `:refer` or `:refer-macros`, Dirac is able to understand this and offer such names in code completions.

### What is the meaning of colors in code completion suggest boxes?

They should hint additional info about given suggestion. Let's look at some examples:

<table>
<tr>
<td valign="top"><a href="https://dl.dropboxusercontent.com/u/559047/dirac-suggest-lo.png"><img src="https://dl.dropboxusercontent.com/u/559047/dirac-suggest-lo.png"></a></td>
<td valign="top"><a href="https://dl.dropboxusercontent.com/u/559047/dirac-suggest-dirac-run.png"><img src="https://dl.dropboxusercontent.com/u/559047/dirac-suggest-dirac-run.png"></a></td>
<td valign="top"><a href="https://dl.dropboxusercontent.com/u/559047/dirac-suggest-goog-str.png"><img src="https://dl.dropboxusercontent.com/u/559047/dirac-suggest-goog-str.png"></a></td>
</tr>
</table>

Currently Dirac can display following colors:

 * green - cljs namespaces and their content
 * red - cljs macro namespaces and their content
 * blue - Google Closure namespaces and their content (or any other code participating in Closure modules)
 * orange - special REPL commands

Sometimes you can spot combined boxes. For example, red + green means a "combined namespace".
It tells you that this name represents both a cljs namespace and a macro namespace.

Gray names are shadowed, meaning that something else with the same name took precedence.

### How do you keep Dirac DevTools up to date with official releases?

I have been [merging upstream changes](https://github.com/binaryage/dirac/network) pretty frequently. 
Most merges are without conflicts or with trivial changes, git helps here a lot.

Additionally I maintain a set of automated tests which exercise Dirac features. This allows me to stay pretty confident that nothing broke between updates. 
For inspiration you can watch [this video](https://youtu.be/nTEelzQTN0w) showing a typical test run (as of Sep-2016).

### Something broke! How do I debug Dirac DevTools frontend?

This is not practical because Dirac DevTools code is minified and ClojureScript parts are compiled with `:advanced` optimizations.
Dirac should display uncaught internal DevTools exceptions in your page's console (since v0.6.1).
This is just for convenience - you get at least some visible feedback about exceptions in the DevTools window.

But still you may want to open the internal DevTools and tinker with the state of Dirac DevTools.
You can open internal DevTools to inspect Dirac DevTools window (e.g. press `CMD+OPT+I` on a Mac while Dirac DevTools window is focused).

Tip: Also you may want to go to `chrome://extensions`, open Dirac DevTools options page and set "Open Dirac DevTools" to "as a new window".
 This way you can have internal DevTools docked inside Dirac DevTools window which I personally find more convenient.

For more serious debugging you have to setup a dev environment and build a dev version of Dirac Chrome Extension.
