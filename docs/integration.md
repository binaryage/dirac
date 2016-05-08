# Dirac DevTools Integration

Dirac wants to integrate well with your editor/IDE workflow.

If your tools offer remote REPL connections to a nREPL server,
you should be able to join Dirac REPL sessions running in the browser
and send their commands directly from your editor.

This feature is available in Dirac v0.3.0 and up.
I personally use [Cursive IDE](https://cursive-ide.com) so I'm going to demonstrate the features with Cursive.
But you should be able to achieve similar results with any nREPL client.

You are welcome to update this page with custom setup for your editor of choice.

### Cursive IDE

Dirac middleware enhances your nREPL server with a special REPL command `dirac!`.

This command provides a command-line interface to Dirac REPL settings.
When you run `(dirac! :help)` you should see something useful:

![Dirac help command](https://dl.dropboxusercontent.com/u/559047/dirac-help-version-status-example.png)

You can play with it in any open nREPL session but it is most useful when used from a normal Clojure session.
In a normal Clojure session you can use the `:join` command to connect your current REPL session to an existing Dirac session. Then you can talk to it from your favourite editor (see `(dirac! :help :join)`).

In this case we will setup Cursive IDE to connect to our nREPL server on port 8230:

![Cursive remote REPL setup](https://dl.dropboxusercontent.com/u/559047/cursive-nrepl-settings.png)

When you connect to this nREPL server you should enter a normal Clojure nREPL session.
You can test that dirac middleware is present by trying `(dirac! :status)` or `(dirac :version)` again:

![Cursive workflow](https://dl.dropboxusercontent.com/u/559047/dirac-cursive-workflow.png)

In the screenshot above I have followed the comments in the code and joined an existing Dirac REPL session.
Then I used Cursive's tools to switch REPL namespace to my current file, loaded the file, and executed the selected form
in the editor.

Here you can see what happened on the Dirac side in the browser:

![Dirac REPL: Hello, Cursive](https://dl.dropboxusercontent.com/u/559047/dirac-repl-hello-from-cursive.png)

As you can see, the `in-ns` command was issued. Then Dirac loaded the file with its side-effects. Then it called the `hello!`
function. The `hello!` function uses `console.log` to print the greeting. This is why it is visible only on the Dirac side.
Console output is treated as a side-effect and is not normally sent back.

---

This was a quick demonstration of integration of Cursive REPL and Dirac REPL into a unified workflow.
It is a new feature in 0.3.0 so expect rough edges. I'm going to polish it over next few releases.
