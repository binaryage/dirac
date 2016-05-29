# Dirac DevTools Upgrading

So you started using Dirac DevTools, followed installation steps and integrated it into your workflow.
Then forgot everything and now a new version just came out and you don't remember details of the setup.

Dirac is quite complex beast. This page should help you to upgrade smoothly.

First please note that Dirac has independent components and their versions should match:

1. [Dirac Chrome Extension](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi) installed in your Chrome Canary
1. Dirac Runtime - a ClojureScript library installed in your page
1. nREPL server with Dirac nREPL middleware
1. Dirac Agent - a helper server providing a proxy tunnel between nREPL server and DevTools Extension

Note that runtime, nREPL middleware and agent are all bundled in a single library "binaryage/dirac" [published on clojars](https://clojars.org/binaryage/dirac).

#### Understanding the release process

When we publish a new Dirac release, it gets tagged on github in [releases](https://github.com/binaryage/dirac/releases),
also a new version of Dirac library is [pushed to clojars](https://clojars.org/binaryage/dirac).
And a matching build of Dirac Chrome Extension
is [uploaded to Chrome Web App Store](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi).

For special cases we also attach Chrome Extension zip package to release files on GitHub. This is for people who don't want
 to use Chrome Web App Store and install the extension from local package.

#### Scenario A: Dirac extension was updated first

If you don' t follow github or clojars. You are likely to get an update of Chrome Extension first because extensions
in Chrome update automatically (by default). Next time you work with Dirac Extension and it encounters an outdated runtime
in the page it should display a warning.

It is recommended to update your clojars dependency to a matching version and make sure to restart all your systems.
 That means restarting nREPL server, Dirac Agent and reload your app's page with updated runtime.

#### Scenario B: Dirac library was updated first

You might be using [lein-ancient](https://github.com/xsc/lein-ancient) or similar tool which notifies about updated clojars libraries.
When you happen to update Dirac library first and don't update extension at the same time, you should again get some warnings
about version mismatch between Dirac Runtime and Dirac Extension.

Chrome might be slower in auto-updating the extension. It usually [takes several hours](http://stackoverflow.com/questions/24100507/how-often-do-chrome-extensions-automatically-update).

To force an immediate update, you can go to `chrome://extensions`, tick the "Developer mode" checkbox at the top right,
then press the "Update Extensions Now" button.

In case of troubles you could try to start Chrome Canary with a clean user profile
and [repeat installation steps](https://github.com/binaryage/dirac/blob/master/docs/installation.md#setup-dirac-chrome-extension)
for the extension. Or use the latest standalone Dirac Extension zip from github releases.

#### Scenario C: Something went wrong

Unfortunately upgrading is not always smooth. Dirac is still under heavy development and installation steps or configuration
 might have changed between versions. Also Dirac is quite fragile because it needs to be integrated well into your project
 environment and can interfere with other libraries or tools you might be using.

A quick check in case of upgrading troubles:

1. make sure you have restarted everything depending on Dirac library and your Chrome
1. read release notes, in case of breaking changes there should be some word about it
1. try installing everything from scratch with clean chrome profile as described in the [installation guide](installation.md)
1. try to look at the [sample project](https://github.com/binaryage/dirac-sample) which should be always working with the latest Dirac version
1. you might want to look into [issues at github](https://github.com/binaryage/dirac/issues), chances are you have encountered an open problem
1. you might also try to ask for help in `#dirac` channel on [clojurians Slack](http://clojurians.net)