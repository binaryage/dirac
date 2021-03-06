# Dirac CLI

Dirac provides a command line interface for easier access to Dirac DevTools functionality.

By default `dirac` command launches Chromium with a matching Dirac version. This should be a replacement for your normal way 
how you launch Chrome for development.

### Installation

Please use this one-liner to download and launch Dirac installer (by default it will install into `/usr/local/bin`): 

```
curl -s https://raw.githubusercontent.com/binaryage/dirac/master/install > /tmp/dirac.install && sudo bash /tmp/dirac.install
```

Alternatively you might want to download [dirac](https://github.com/binaryage/dirac/blob/master/dirac)
shell script and put it somewhere on your system PATH by hand.

### Quick start

1. run `dirac` and wait for Chrome to launch
1. in Chrome navigate away from "chrome://welcome" to some normal page, e.g. [https://clojurescript.org](https://clojurescript.org)
1. in Chrome open DevTools (CTRL+SHIFT+I or CMD+OPT+I on a Mac)
1. in DevTools switch to Console => Dirac prompt should enter `dirac.playground` and let you type in cljs code
1. in Console enter `(js/console.log (str "Hello" \space "Dirac!"))`

## FAQ

#### Where is Dirac home directory located?

> By default, Dirac stores some state and working files in `~/.dirac`
> You can override this via `DIRAC_HOME` env variable.

#### How does Dirac locate Chromium executable on my machine?

> You are probably seeing "Unable to locate Chromium executable" error from `dirac launch`.
> Dirac tries to locate Chromium executable on your machine using some heuristics depending on your OS.
> 1. Under macOS it tries to use `/Applications/Google Chrome Canary.app`. 
> 2. Under Windows it tries to use `"\\Google\\Chrome SxS\\Application\\chrome.exe"` from `Program Files` (depends on your OS version) 
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

> Dirac checks Chrome version and then it downloads and consults [binaryage/dirac/releases.edn](https://github.com/binaryage/dirac/blob/master/releases.edn). 
> This file maintains a mapping between Dirac releases and Chrome versions. It is cached in `$DIRAC_HOME/releases.edn`.
>
> If required, you can provide alternative version of this file via `dirac launch --releases /path/to/releases.edn`.

#### How do I tell `dirac` to echo effective clojure command?

> `env DIRAC_CLI_ECHO_CMD=1 dirac`

#### How do I force `dirac` to use specific version?

> `env DIRAC_CLI_VERSION=1.5.0 dirac`

#### How do I force `dirac` to use latest code from GitHub?

> `env DIRAC_CLI_VERSION=master dirac`

---

##### `> dirac help`
```
Dirac 1.5.2
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

##### `> dirac help launch`
```
Dirac 1.5.2
A command-line tool for Dirac DevTools.

Usage: dirac [...] launch [options]

Options:
      --profile NAME              default  Specify Chromium data dir
      --no-profile                         Don't specify any Chromium data dir
      --chromium-version VERSION           Force specific Chromium version, does not ask the binary
      --dry-chromium                       Don't spawn Chromium, only print launch command
      --debug PORT                         Spawn Chromium with --remote-debugging-port=PORT
      --no-playground                      Don't support playground
      --releases PATH                      Force alternative releases.edn file, do not check for updates
      --releases-url URL                   Force alternative releases.edn url

Launch Chromium with matching Dirac release:
  1. locate Chromium binary on user's machine
  2. detect Chromium version
  3. download/prepare matching Dirac release
  4. launch Chromium with proper commandline flags, most notably --custom-devtools-frontend

Run `dirac help` for general info.
```

##### `> dirac help nuke`
```
Dirac 1.5.2
A command-line tool for Dirac DevTools.

Usage: dirac [...] nuke [options]

Options:
      --confirm  Force require confirmation

Reset Dirac into factory defaults:
  1. delete Dirac HOME directory

Run `dirac help` for general info.
```
