# Hacking on Dirac

Unfortunately Dirac is pretty complex project with a lot of moving parts. Proficiency in Clojure/Script tooling is expected. 
In case of troubles ask in #dirac channel on [clojurians Slack](http://clojurians.net).

### Initial setup

I'm using macOS so most dev tasks were tested only under Mac. With some minor tweaks it should be easy to run them under 
linux-based OSes as well.

The basic idea is to compile all projects in dev mode with figwheel (whenever possible). Then launch Chrome Canary pointing
to unpacked extension sources, spawn a dev server with some example project and do some development.

### Directory structure

We have multiple repositories, so you should create a workspace directory where you clone them side by side. 
Some scripts expect this directory layout.

Let's setup an env variable to make our future snippets less verbose (change the path to your liking): 
```
export DWS=/Users/darwin/code/dirac-ws
```

Initial clone:
```
mkdir -p "$DWS"
cd "$DWS"
git clone https://github.com/binaryage/dirac.git
git clone https://github.com/binaryage/dirac-sample.git
git clone https://github.com/binaryage/cljs-devtools.git
```

When using Dirac sample project in dev mode, we use lein checkouts to reference latest local sources. You need to do this: 
```
cd "$DWS"
cd dirac-sample
mkdir checkouts
cd checkouts
ln -s "../../dirac" dirac
ln -s "../../cljs-devtools" cljs-devtools
```

Please note that more directories can get created in this workspace directory by some dev tasks. They act as caches or 
temporary directories.

### Hack on the dirac-sample

I tend to use a convenience lein task `lein dev-dirac-sample`. This uses [lein-cooper](https://github.com/kouphax/lein-cooper) 
to run multiple terminal commands in a single window.
 
Here is how the output looks on my machine:
[https://gist.github.com/darwin/0742ab67493c0149e934476b05e74bf3](https://gist.github.com/darwin/0742ab67493c0149e934476b05e74bf3).

The task launched several sub-tasks: 

* fig-dirac = figwheel compiler for Dirac extension source files
* fig-marion = figwheel compiler for Marion extension source files (marion is a helper extension for test automation)
* marion-cs = cljs-build compiler for Marion's content script
* fig-sample = figwheel compiler for sample project source files
* server-sample = dev server for serving sample project html files
* browser = a helper task for launching pre-configured Chrome Canary instance 

At the end the task opened Chrome Canary browser using a clean user profile with properly configured `--remote-debugging-port=9222` and
`--load-extension` pointing to our unpacked extension locations. It also opened demo project starting page: [http://localhost:9977/demo.html](http://localhost:9977/demo.html).
You might want to change it to [http://localhost:9977/tests.html](http://localhost:9977/tests.html) or create your own [here](https://github.com/binaryage/dirac-sample/tree/master/resources/public).

You can validate extension configuration by visiting `chrome://extensions`:

<img src="https://box.binaryage.com/dirac-dev-sample-extension-setup.png" width=800>

Chrome should have checked-in "Developer mode" (see top-right). Dirac DevTools must be pointing to `dirac/resources/unpacked` and
Dirac Marionettist must be pointing to `dirac/test/marion/resources/unpacked`.

You should be able to follow [Dirac Sample Project readme](https://github.com/binaryage/dirac-sample) and
when you open internal DevTools on Dirac DevTools window you should see console messages with cljs-devtools formatting and
dev-mode source files (not packed by advanced compilation).

Note that your still have to run `lein repl` in a separate terminal session to start an nREPL server:
```
cd "$DWS/dirac-sample"
lein repl
```

See [this FAQ entry](https://github.com/binaryage/dirac/blob/master/docs/faq.md#something-broke-how-do-i-debug-dirac-devtools-frontend) 
for additional tips on debugging.

Also note that you can run individual sub-tasks by hand in separate terminal windows. But that requires more work. 

### Hack on dirac tests

Similarly to the cooper task above I have a convenience task for developing dirac tests and running them in interactive mode.
 
```
lein dev-browser-tests
```

The output might look [like this](https://gist.github.com/darwin/5aa4038d4089fa258ec98b4718039f58). This will additionally
compile test projects using figwheel and launch an nREPL server with verbose logging.

Launched Chrome instance should navigate to `http://localhost:9080/?set-agent-port=9041`:
<img src="https://box.binaryage.com/dirac-tests-list.png" width=800>

Clicking individual task links in "AVAILABLE TASKS" section you can run individual tests interactively. The "AVAILABLE SCENRAIOS"
section is handy for cases when you want to manually open a scenario and test it ad-hoc.

Note that task sources are located in [`test/browser/fixtures/src/tasks/dirac/tests/tasks`](https://github.com/binaryage/dirac/tree/master/test/browser/fixtures/src/tasks/dirac/tests/tasks)
and scenario files are located in [`test/browser/fixtures/src/scenarios*`](https://github.com/binaryage/dirac/tree/master/test/browser/fixtures/src).
 
#### Advanced tips: 

##### Pause task execution

Sometimes it is handy to pause task execution and explore Dirac state. You can do that by clicking "pause!" in the
task runner's toolbar. But be aware that you can do that programmatically as well. You can insert `(<!* (a/wait-for-resume!))` 
anywhere in `go-task` instruction list. Sometimes it is the only way how to pause task precisely between specific commands.

For example here I paused the `welcome-message` task by clicking the button:

<img src="https://box.binaryage.com/dirac-task-runner-paused.png" width=800>

FYI, it could be done programmatically by placing `wait-for-resume` after [this line](https://github.com/binaryage/dirac/blob/c07f7dd3646c3153069258f9dad6e1f9cd809a3f/test/browser/fixtures/src/tasks/dirac/tests/tasks/suite02/welcome_message.cljs#L10).

And here it was resumed and finished green:

<img src="https://box.binaryage.com/dirac-task-runner-finished.png" width=800>

### Running tests locally

If you have your local machine in a good shape with all dependencies, it should be as easy as:
 
```
cd "$DWS/dirac"
lein test
```

Or `lein test-browser` if you want to run just browser tests or `lein test-browser issue-55` if you want to run specific tests.

Please note that browser tests require [latest chromedriver](https://sites.google.com/a/chromium.org/chromedriver/) to be 
installed. Also note that we rsync whole project into `$DWS/.test_stage` and run tests from there. Tests could run longer than 
10 minutes on slower machines. This allows you to run tests in background and continue hacking on the `$DWS/dirac` working 
copy without disrupting the tests.

### Running tests via Docker

If you don't want to setup your local environment or if you want to run tests under the same system as [travis] you can
use my docker scripts below.

```
cd "$DWS/dirac"
```

This will build "dirac" docker image:
```
./scripts/docker-build.sh
```

This will run all tests using "dirac" image similar to Travis environment:
```
./scripts/docker-run.sh test
```
 
This will run only browser tests:
```
./scripts/docker-run.sh test-browser
```

And to filter specific test suite:
```
./scripts/docker-run.sh test-browser issue-55
```

Subsequent `./scripts/docker-run.sh test*` commands will reuse caches (in `$DWS/.docker_test_stage`). So you might want to 
`lein clean` there in case of weird problems. 

You can do that by running an arbitrary command (it will execute it in `$DWS/.docker_test_stage` within docker):
```
./scripts/docker-run.sh lein clean
```

This will delete all caches and docker images for you to start from scratch:
```
./scripts/docker-clean.sh
```

Please note that the tests might be flaky and fail for unknown "timing" issues. Next run usually goes well. Also I had to 
increase Docker's memory limit to 6GB to overcome "error getting events from daemon: EOF" intermittent errors.
