# Dirac Main

Yep, dirac.main is a command-line tool to ease work with Dirac. 
Most notably it can be used to launch Chrome with
Dirac DevTools embedded instead of standard DevTools.

### Install 

To install it please follow [this gist](https://gist.github.com/darwin/daad78052f3fa17a353c56dca6ad7a59).
It could be a good idea to alias it to `dirac` in your shell.

By default `dirac` will launch Chromium with matching Dirac version (which will be obtained from github if not cached).
Dirac will also create a "playground" compilation environment with Dirac Runtime present. It will use
this in case there is no Dirac Runtime present in the page. This will give you ad-hoc REPL in any page and allows Dirac test 
drive.

### To try it:

1. `dirac`
2. in launched Chrome, open DevTools (CMD+OPT+I on Mac)
3. in DevTools switch Console => Dirac prompt should enter `dirac.playground` and let you type in cljs code

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
