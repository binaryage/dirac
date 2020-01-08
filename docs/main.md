# Dirac Main

Dirac Main is a command-line tool to ease working with Dirac. Most notably it can be used to launch Chrome with
Dirac DevTools embedded instead of standard DevTools. 

TODO

```bash
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

Dirac Agent v1.4.6
Connected to nREPL server at nrepl://localhost:36180.
Agent is accepting connections at ws://localhost:36181.
Launching Chromium [with --user-data-dir='/Users/darwin/.dirac/chromium/profiles/default'] ...
...
```
