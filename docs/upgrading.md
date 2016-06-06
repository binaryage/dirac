# Dirac DevTools Upgrading

So you started using Dirac DevTools, followed installation steps and integrated it into your workflow. Then forgot everything ;-)

And now a new version just came out and you don't remember details of the setup. Yep, Dirac is quite a complex beast. This page should hopefully help you to upgrade smoothly.

First please note that Dirac has independent parts and their versions should match:

1. [Dirac Chrome Extension](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi) installed in your Chrome Canary
1. Dirac Runtime - a ClojureScript library installed in your page
1. nREPL server with Dirac nREPL middleware
1. Dirac Agent - a helper server providing a proxy tunnel between the nREPL server and the Dirac Chrome Extension

Note that the Runtime, nREPL middleware and Agent are all bundled in a single library "binaryage/dirac" [published on Clojars](https://clojars.org/binaryage/dirac).

#### Understanding the release process

When we publish a new Dirac release, it gets tagged on GitHub in [releases](https://github.com/binaryage/dirac/releases),
also a new version of Dirac library is [pushed to Clojars](https://clojars.org/binaryage/dirac).
And a matching build of Dirac Chrome Extension
is [uploaded to Chrome Web App Store](https://chrome.google.com/webstore/detail/dirac-devtools/kbkdngfljkchidcjpnfcgcokkbhlkogi).

For special cases we also attach Chrome Extension zip package to release files on GitHub. This is for people who don't want
 to use Chrome Web App Store and want to install the extension from local package.

#### Scenario A: Dirac extension was updated first

If you don' t follow GitHub or Clojars. You are likely to get an update of Chrome Extension first because extensions
in Chrome update automatically (by default). Next time you work with Dirac Chrome Extension and it encounters an outdated
Dirac Runtime in your app's page it should display a warning.

It is recommended to update your Clojars dependency to a matching version and make sure to restart all your systems.
 That means restarting nREPL server, Dirac Agent and reload your app's page with updated Dirac Runtime.

#### Scenario B: Dirac library was updated first

You might be using [lein-ancient](https://github.com/xsc/lein-ancient) or similar tool which notifies about updated Clojars libraries.
When you happen to update the Dirac Library first and don't update the Dirac Chrome Extension at the same time, you should again get some warnings
about version mismatch between the Dirac Runtime and the Dirac Chrome Extension.

Please note that Chrome might be slower in auto-updating extensions.
It usually [takes several hours](http://stackoverflow.com/questions/24100507/how-often-do-chrome-extensions-automatically-update).

To force an immediate update, you can go to `chrome://extensions`, tick the "Developer mode" checkbox at the top right,
then press the "Update Extensions Now" button.

In case of troubles you could try to start a new Chrome Canary instance with a clean user profile
and [repeat installation steps](https://github.com/binaryage/dirac/blob/master/docs/installation.md#setup-dirac-chrome-extension)
for the extension. Or use the latest standalone Dirac Extension zip from the GitHub releases.

#### Scenario C: Something went wrong

Unfortunately upgrading is not always a smooth sail. Dirac is still under heavy development and installation steps or configuration
 might have changed between versions. Also Dirac is quite fragile because it needs to be integrated well into your project
 environment and can interfere with other libraries or tools you might be using.

Here is a quick check list in case of upgrading troubles:

1. make sure you have restarted everything depending on Dirac library and your Chrome (and `lein clean` to play it safe)
1. read release notes, in case of known breaking changes there should be some word about it
1. try installing everything from scratch with clean Chrome profile as described in the [installation guide](installation.md)
1. try to look at the [sample project](https://github.com/binaryage/dirac-sample) which should be always working with the latest Dirac version
1. you might want to look into [issues at github](https://github.com/binaryage/dirac/issues), chances are you have encountered an open problem
1. you might also try to ask for help in `#dirac` channel on [clojurians Slack](http://clojurians.net)