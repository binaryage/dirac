# Dirac Main

Yep, dirac.main is a command-line tool to ease work with Dirac. 
Most notably it can be used to launch Chrome with
Dirac DevTools embedded instead of standard DevTools.

### Install 

To install it please follow [this gist](https://gist.github.com/darwin/daad78052f3fa17a353c56dca6ad7a59).
It could be a good idea to alias it to `dirac` in your shell.

By default `dirac` will launch Chromium with a matching Dirac version (which will be obtained from github if not cached).
Dirac will also create a "playground" project with Dirac Runtime present. It will fall back to this project in cases 
where there is no Dirac Runtime present in the page.

### To try it:

1. `dirac launch`
2. in launched Chrome, open DevTools (CMD+OPT+I on a Mac)
3. navigate away from "chrome://welcome" to some normal page, e.g. [clojurescript.org](https://clojurescript.org)
4. in DevTools switch Console => Dirac prompt should enter `dirac.playground` and let you type in cljs code

## FAQ

#### Where is Dirac home directory located?

> By default, Dirac stores some state and working files in `~/.dirac`
> You can override this via `DIRAC_HOME` env variable.

#### How does Dirac locate Chromium executable on my machine?

> You are probably seeing "Unable to locate Chromium executable" error from `dirac launch`.
> Dirac tries to locate Chromium executable on your machine using some heuristics depending on your OS.
> 1. Under macOS it tries to use `/Applications/Google Chrome Canary.app`. 
> 2. Under Windows it tries to use `"\\Google\\Chrome SxS\\Application\\chrome.exe"` from `Program Files` (depending on your OS version) 
> 3. Under other systems it tries various well-known paths
> 
> Look at [the code](https://github.com/binaryage/dirac/blob/master/src/home/dirac/home/chromium/scout.clj) for 
> nitty-gritty details.
>
> You can always specify exact path to your Chromium via `CHROMIUM_PATH` env variable. Alternatively you can
> create a symlink pointing to your Chrome binary at `$DIRAC_HOME/chromium/link`. Alternatively, instead of symlink, it can 
> be just a text file with absolute path on the first line.   

#### It seems like Dirac launches Chromium with clean settings. Why?

> It is a good practice to let Chrome using a separate profile during development. 
> This way development sessions do not interfere with your normal browsing sessions. 
> By default `dirac` launches Chrome with `--user-data-dir=$DIRAC_HOME/chromium/profiles/default`.
>  
> You can use `dirac launch --profile name` to specify alternative profile name instead of `default`. 
> Or `--no-profile` to let Chrome use system-wide settings.
> 
> Just be aware of this and feel free to delete `$DIRAC_HOME/chromium/profiles` to start from scratch with factory defaults.

#### What is Playground?

> Is an ad-hoc project to test-drive Dirac REPL without your own backend project.
> Dirac falls back to playground on pages where there is no Dirac Runtime present and you switch to Dirac REPL.
> This allows simple demo interaction with REPL on any page using ClojureScript.

#### How to reset into factory defaults?

> Run `dirac nuke`. This will delete `$DIRAC_HOME` and let you start from scratch.

#### Where does Dirac store downloaded versions?

> Look into `$DIRAC_HOME/silo`

#### How do you know which Dirac version is compatible with my particular Chrome version?

> Dirac checks Chrome version and then it downloads and consults `https://github.com/binaryage/dirac/blob/master/releases.edn`. 
> This file maintains a mapping between Dirac releases and Chrome versions. It is cached in `$DIRAC_HOME/releases.edn`.
>
> If required, you can provide alternative version of this file via `dirac launch --releases /path/to/releases.edn`.

---

```
> dirac help
Dirac Main 1.5.0
A command-line tool for Dirac DevTools.

Usage: dirac [options] [command] [...]

Options:
  -v                 Verbosity level; may be specified multiple times to increase value
      --quiet        Run quietly
      --no-color     Force disabling ANSI colored output
      --force-color  Force enabling ANSI colored output
  -h, --help

Commands:
  help    Show usage info
  launch  Launch Chromium with Dirac
  nuke    Reset Dirac into factory-defaults (delete home dir)

Run `dirac help <command>` for further info.
```

```
> dirac launch
Located Chromium executable at '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'.
Detected Chromium version '81.0.4020.0'
Resolved matching Dirac release as '1.5.0'
Matching Dirac release is located at '/Users/darwin/.dirac/silo/v/1.5.0'
Preparing playground environment at '/Users/darwin/.dirac/playground'
Compiling playground project...
Starting playground HTTP server on port 9112
Booting Dirac Agent...
Starting nREPL server v0.6.0 on port 36180

Dirac Agent v1.5.0
Connected to nREPL server at nrepl://localhost:36180.
Agent is accepting connections at ws://localhost:36181.
Launching Chromium [with --user-data-dir='/Users/darwin/.dirac/chromium/profiles/default'] ...
...
```
