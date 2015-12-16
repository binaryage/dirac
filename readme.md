# Dirac

Dirac is a DevTools fork with extra features to aid development in ClojureScript.
Dirac optionally depends on [cljs-devtools](https://github.com/binaryage/cljs-devtools)
and [figwheel](https://github.com/bhauman/lein-figwheel) for some of its features.

![REPL](https://dl.dropboxusercontent.com/u/559047/dirac-teaser.png)

I don't have ambition for Dirac to be merged upstream into official DevTools.
The changes are too specific for ClojureScript and not generally useful for Javascript devs.
Instead the idea is to maintain a set of patches rolling on top of official DevTools code.

We also provide a Chrome extension which wraps Dirac just to make the life a bit easier for Dirac users.
You should use latest Chrome Canary with Dirac to prevent any compatibility issues.

#### Features

  * REPL integrated into DevTools Javascript console (with [Parinfer](https://shaunlebron.github.io/parinfer) goodness)
  * Custom Formatters enabled by default (for [cljs-devtools](https://github.com/binaryage/cljs-devtools))
  * (planned) reasonable display of ClojureScript variables inlined in source code during code stepping
  * (planned) reasonable display of ClojureScript variables in Scope panels and similar

#### A demo project

You can take [cljs-devtools-sample](https://github.com/binaryage/cljs-devtools-sample) and run it easily with Dirac:

![cljs-devtools-sample with Dirac](https://dl.dropboxusercontent.com/u/559047/dirac-cljs-devtools-sample.png)

##### Initial setup

    mkdir demo-workspace
    cd demo-workspace
    git clone https://github.com/binaryage/cljs-devtools-sample.git
    cd cljs-devtools-sample
    lein prepare-checkouts

In first terminal session run figwheel with example site for dirac:

    lein dirac

In a second terminal session run development web server:

    lein server

Now you should have working demo site at [http://localhost:3000](http://localhost:3000). Second terminal should have figwheel
connected with REPL available. Now close your browser tab (we will use Canary instead, but first we have to build the Dirac extension).

Now compile Dirac extension:

    cd demo-workspace
    git clone https://github.com/binaryage/dirac
    cd dirac
    lein regenerate
    lein release

This should build extension into `releases` name of the extension folder will be `dirac-VERSION`, where version
is current version fetched from Dirac's `project.clj`.

Launch latest Chrome Canary from command-line. We want to install Dirac extension there, so it is better to run it
with a clean/dedicated user profile. Also you have to run it with [remote debugging](https://developer.chrome.com/devtools/docs/debugger-protocol)
enabled on port 9222 (better make an alias of this command):

    /Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary \
          --remote-debugging-port=9222 \
          --no-first-run \
          --user-data-dir=~/.dev-chrome-profile

Now install Dirac extension. For now, you have to switch to Developer mode and [load it as unpacked extension](https://developer.chrome.com/extensions/getstarted#unpacked).
Folder with your compiled Dirac is `demo-workspace/dirac/releases/dirac-0.1.0-SNAPSHOT` or similar.

Success? Now you can navigate to [http://localhost:3000](http://localhost:3000). Do not open standard DevTools, instead
click the extension button with "cljs" logo on it (or hit `CMD+SHIFT+I`). It should open a new window with Dirac DevTools.
It will look almost the same as normal DevTools, but you can tell a difference. The url will be
`chrome-extension://<some-id>/devtools/front_end/inspector.html?...` and also active tab highlight will be green instead
of blue (see the screenshot above).

Finally you can switch to Console there and you should see bunch of cljs-devtools formatted values. And you should
see there also

    Figwheel: trying to open cljs reload socket
    Figwheel: socket connection established

That means REPL should work.

Focus Console prompt and press `PageUp`. This should switch you to green-ish prompt with "cljs.user" as placeholder.
Now you can type REPL commands and they will be sent to figwheel for compilation. The experience should be similar
to entering commands directly to terminal running figwheel REPL prompt. To switch back to Javascript prompt, hit `PageDown` or
`PageUp` again (it cycles between those two prompts).

The installation is still a bit involved. Later I will probably provide Chrome extension via Chrome Web Store. But integration
 of figwheel and cljs-devtools will have to be done on per-project basis.

### Credits

* [Antonin Hildebrand](https://github.com/darwin) - [cljs-devtools](https://github.com/binaryage/cljs-devtools), [chromex](https://github.com/binaryage/chromex)
* [Bruce Hauman](https://github.com/bhauman) - [figwheel](https://github.com/bhauman/lein-figwheel)
* [Shaun LeBron](https://github.com/shaunlebron) - [parinfer](https://github.com/shaunlebron/parinfer)

---

#### License [MIT](license.txt)