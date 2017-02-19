;; The faster way to use clj-webdriver: take a taxi
(ns clj-webdriver.taxi
  (:use [clj-webdriver.element :only [element-like?]]
        [clj-webdriver.driver :only [driver?]])
  (:require [clj-webdriver.core :as core]
            [clj-webdriver.window :as win]
            [clj-webdriver.util :as util]
            [clj-webdriver.options :as options]
            [clj-webdriver.wait :as wait])
  (:import clj_webdriver.element.Element))

(declare css-finder)
(def ^:dynamic *driver*)
(def ^:dynamic *finder-fn* css-finder)

(def ^{:doc (str "Alias of clj-webdriver.core/new-driver:\n"
                 (:doc (meta #'clj-webdriver.core/new-driver)))
       :arglists (:arglists (meta #'clj-webdriver.core/new-driver))}
  new-driver clj-webdriver.core/new-driver)

(defn- set-driver*
  "Given a `browser-spec`, instantiate a new Driver record and assign to `*driver*`."
  [browser-spec]
  (let [new-driver (if (driver? browser-spec)
                     browser-spec
                     (core/new-driver browser-spec))]
       (alter-var-root (var *driver*)
                       (constantly new-driver)
                       (when (thread-bound? (var *driver*))
                         (set! *driver* new-driver)))))

(declare to)
(defn set-driver!
  "Set a default `Driver` for this thread, optionally sending it to a starting `url`.

   Available browsers are `:firefox`, `:chrome`, `:ie`, `:opera`, `:phantomjs` and `:htmlunit`.

   Examples:
   =========

   ;;
   ;; Simple example
   ;;
   (set-driver! {:browser :firefox})

   ;;
   ;; Full example
   ;;
   (set-driver! {:browser :firefox
                 :cache-spec {:strategy :basic,
                              :args [{}],
                              :include [ (fn [element] (= (attribute element :class) \"external\"))
                                         {:css \"ol#pages\"}]}

   ;;
   ;; Use existing Driver record
   ;;
   (set-driver! a-driver)"
  ([browser-spec] (set-driver* browser-spec))
  ([browser-spec url] (to (set-driver* browser-spec) url)))

(defn set-finder!
  "Set a default finder function, which will be used with all `q` parameters in functions that require an Element.

   Examples:
   =========

   ;;
   ;; Simple example
   ;;
   (set-finder! xpath-finder)

   ;;
   ;; Derivative finder function
   ;;
   ;; Takes the query string and always prepends \"div#container \", which would be
   ;; useful in situations where you know you're always inside that particular div.
   ;; (Note that this same functionality is provided by `find-element-under`, but
   ;; you get the idea.)
   ;;
   (set-finder! (fn [q]
                  (if (element-like? q)
                    q
                    (css-finder (str \"div#container \" q)))))

   ;;
   ;; Custom finder function
   ;;
   ;; If you want to easily switch between using CSS and XPath (e.g., because
   ;; XPath has the text() function for which no CSS equivalent exists), then
   ;; you could write something like this, where `q` would become either the map
   ;; {:css \"query\"} or {:xpath \"query\"} instead of just a string.
   ;;
   (set-finder! (fn [q]
                  (if (element-like? q)
                    q
                    (case (first (keys q))
                      :css   (core/find-elements-by *driver* (by-css (first (values q))))
                      :xpath (core/find-elements-by *driver* (by-xpath (first (values q))))))))

   ;;
   ;; (Note: This last example is written to show how to use the lowest-level functions
   ;; `find-elements-by`, `by-css` and `by-xpath`. The maps `{:css \"query\"}` and
   ;; `{:xpath \"query\"}` are themselves acceptable arguments to the `find-elements`,
   ;; function, so that function could have been used instead without the `case` statement.)
   ;;"
  [finder-fn]
  (alter-var-root (var *finder-fn*)
                  (constantly finder-fn)
                  (when (thread-bound? (var *finder-fn*))
                    (set! *finder-fn* finder-fn))))

(declare quit)
(defmacro with-driver
  "Given a `browser-spec` to start a browser, execute the forms in `body`, then call `quit` on the browser. Uses the default finder function.

   Examples:
   =========

   ;;
   ;; Log into Github
   ;;
   (with-driver {:browser :firefox}
     (to \"https://github.com\")
     (click \"a[href*='login']\")

     (input-text \"#login_field\" \"your_username\")
     (-> \"#password\"
       (input-text \"your_password\")
       submit))"
  [browser-spec & body]
  `(binding [*driver* (core/new-driver ~browser-spec)]
    (try
      ~@body
      (finally
        (quit)))))

(defmacro with-driver-fn
  "Given a `browser-spec` to start a browser and a `finder-fn` to use as a finding function, execute the forms in `body`, then call `quit` on the browser.

   Examples:
   =========

   ;;
   ;; Log into Github
   ;;
   (with-driver {:browser :firefox} xpath-finder
     (to \"https://github.com\")
     (click \"//a[text()='Login']\")

     (input-text \"//input[@id='login_field']\" \"your_username\")
     (-> \"//input[@id='password']\"
       (input-text \"your_password\")
       submit))"
  [browser-spec finder-fn & body]
  `(binding [*driver* (core/new-driver ~browser-spec)
             *finder-fn* ~finder-fn]
    (try
      ~@body
      (finally
        (quit)))))

(defn css-finder
  "Given a CSS query `q`, return a lazy seq of the elements found by calling `find-elements` with `by-css`. If `q` is an `Element`, it is returned unchanged.

   This function is used internally by the Taxi API as `*finder*`. See the documentation for `set-finder!` for examples of extending this function or creating your own custom finder function."
  ([q] (css-finder *driver* q))
  ([driver q]
     (cond
       (element-like? q) q
       (map? q)     (core/find-elements driver q)
       :else        (core/find-elements driver {:css q}))))

(set-finder! css-finder)

(defn xpath-finder
  "Given a XPath query `q`, return a lazy seq of the elements found by calling `find-elements` with `by-xpath`. If `q` is an `Element`, it is returned unchanged.

   This function is used internally by the Taxi API as `*finder*`. See the documentation for `set-finder!` for examples of extending this function or creating your own custom finder function."
  ([q] (xpath-finder *driver* q))
  ([driver q]
     (cond
       (element-like? q) q
       (map? q)     (core/find-elements driver q)
       :else        (core/find-elements driver {:xpath q}))))

;; Be able to get actual element/elements when needed
(defn element
  "Given a query `q`, return the first element that the default finder function returns.

   Examples:
   =========

   ;;
   ;; Simple Example
   ;;
   ;; Create a var that points to an element for later use.
   ;;
   (def login-link (element \"a[href*='login']\"))

   ;;
   ;; More useful example: composing actions on an element
   ;;
   ;; When threading actions together, it's more performant to thread an actual element,
   ;; than to thread simply the query string. Threading the query string makes clj-webdriver
   ;; locate the same element multiple times, while threading an actual element only
   ;; requires one lookup.
   ;;
   (-> (element \"input#password\")
     (input-text \"my-password\")
     submit)"
  ([q] (element *driver* q))
  ([driver q]
     (if (element-like? q)
       q
       (first (*finder-fn* driver q)))))

(defn elements
  "Given a query `q`, return the elements that the default finder function returns.

   Examples:
   =========

   ;;
   ;; Simple Example
   ;;
   ;; Save a seq of anchor tags (links) for later.
   ;;
   (def target-elements (elements \"a\"))"
  ([q] (elements *driver* q))
  ([driver q]
     (if (element-like? q)
       (lazy-seq (list q))
       (*finder-fn* driver q))))

;; ## Driver functions ##
(defn to
  "Navigate the browser to `url`.

   Examples:
   =========

   ;;
   ;; Simple Example
   ;;
   (to \"https://github.com\")

   ;;
   ;; Custom function for building URL's from a base url
   ;;
   (defn go
    [path]
    (let [base-url \"http://example.com/\"]
      (to (str base-url path))))
   ;; (go \"test-page\") would navigate to \"http://example.com/test-page\""
  ([url]
     (to *driver* url))
  ([driver url]
     (core/to driver url)))

(defn back
  "Navigate back in the browser history, optionally `n` times.

   Examples:
   =========

   ;;
   ;; Simple Example
   ;;
   (back)

   ;;
   ;; Specify number of times to go back
   ;;
   (back 2)"
  ([] (back *driver* 1))
  ([driver-or-n] (if (driver? driver-or-n)
                   (back driver-or-n 1)
                   (back *driver* driver-or-n)))
  ([driver n]
     (dotimes [m n]
       (core/back driver))
     driver))

(defn close
  "Close the browser. If multiple windows are open, this only closes the active window.

   Examples:
   =========

   (close)"
  ([] (close *driver*))
  ([driver]
     (core/close driver)))

(defn current-url
  "Return the current url of the browser.

   Examples:
   =========

   (current-url)"
  ([] (current-url *driver*))
  ([driver] (core/current-url driver)))

(defn forward
  "Navigate forward in the browser history.

   Examples:
   =========

   ;;
   ;; Simple Example
   ;;
   (forward)

   ;;
   ;; Specify number of times to go forward
   ;;
   (forward 2)"
  ([] (forward *driver* 1))
  ([driver-or-n] (if (driver? driver-or-n)
                   (forward driver-or-n 1)
                   (forward *driver* driver-or-n)))
  ([driver n]
     (dotimes [m n]
       (core/forward driver))
     driver))

(defn get-url
  "Navigate the browser to `url`.

   Examples:
   =========

   ;;
   ;; Simple Example
   ;;
   (get-url \"https://github.com\")

   ;;
   ;; Custom function for building URL's from a base url
   ;;
   (defn go
    [path]
    (let [base-url \"http://example.com/\"]
      (get-url (str base-url path))))
   ;; (go \"test-page\") would navigate to \"http://example.com/test-page\""
  ([url] (get-url *driver* url))
  ([driver url]
     (core/get-url driver url)))

(defn take-screenshot
  "Take a screenshot of the browser's current page, optionally specifying the format (`:file`, `:base64`, or `:bytes`) and the `destination` (something that `clojure.java.io/file` will accept).

   Examples:
   =========

   ;;
   ;; Simple Example
   ;;
   ;; Return screenshot as file object
   ;;
   (take-screenshot :file)

   ;;
   ;; Specify a default destination for the file object
   ;;
   (take-screenshot :file \"/path/to/save/screenshot.png\")"
  ([] (core/get-screenshot *driver* :file))
  ([format] (core/get-screenshot *driver* format))
  ([format destination] (core/get-screenshot *driver* format destination))
  ([driver format destination] (core/get-screenshot driver format destination)))

(defn page-source
  "Return the source code of the current page in the browser.

   Examples:
   =========

   ;;
   ;; Simple Example
   ;;
   (page-source)

   ;;
   ;; Do something with the HTML
   ;;
   ;; Selenium-WebDriver will instantiate a Java object for every element you query
   ;; or interact with, so if you have huge pages or need to do heavy-duty DOM
   ;; inspection or traversal, it could be more performant to do that \"offline\".
   ;;
   (let [source (page-source)]
     ;; do hard-core parsing and manipulation here
     )"
  ([] (page-source *driver*))
  ([driver]
     (core/page-source driver)))

(defn quit
  "Quit the browser completely, including all open windows.

   Examples:
   =========

   (quit)"
  ([] (quit *driver*))
  ([driver]
     (core/quit driver)))

(defn refresh
  "Refresh the current page in the browser. Note that all references to elements will become \"stale\" and unusable after a page refresh.

   Examples:
   =========

   (refresh)"
  ([] (refresh *driver*))
  ([driver]
     (core/refresh driver)))

(defn title
  "Return the title of the current page in the browser.

   Examples:
   =========

   (title)"
  ([] (title *driver*))
  ([driver]
     (core/title driver)))

(defn window
  "Return a `Window` that contains information about the active window and can be used for switching or resizing.

   Examples:
   =========

   (window)"
  ([] (window *driver*))
  ([driver]
     (core/window driver)))

(defn windows
  "Return `Window` records as a seq for all open windows.

   Examples:
   =========

   (windows)"
  ([] (windows *driver*))
  ([driver]
     (core/windows driver)))

(defn other-windows
  "Return a `Window` for all open windows except the active one.

   Examples:
   =========

   (other-windows)"
  ([] (other-windows *driver*))
  ([driver]
     (core/other-windows driver)))

;; TODO: test coverage
(defn switch-to-frame
  "Switch focus to the frame specified by `frame-q`, which is a standard Taxi element query or an integer for the order (zero-based index) of the frame on the page.

   Examples:
   =========

   (switch-to-frame \"#target-frame\")
   (switch-to-frame 1)"
  ([frame-q] (switch-to-frame *driver* frame-q))
  ([driver frame-q]
     (let [frame (if (number? frame-q)
                   frame-q
                   (element frame-q))]
       (core/switch-to-frame driver frame))))

;; TODO: accept a `Window` record or an attr-val that would get the window
(defn switch-to-window
  "Switch focus to the window for the given one of the following:

    * A string representing the target window name (as seen in the application titlebar)
    * A number representing the index (order) of the target window
    * A `Window` record

   Examples:
   =========

   ;;
   ;; By name
   ;;
   (switch-to-window \"Name Of Window\")

   ;;
   ;; By index (order), open the 3rd window
   ;;
   (switch-to-window 2)

   ;;
   ;; Passing a `Window` record directly (as returned by the `window` function)
   ;;
   (switch-to-window a-window-record)"
  ([window] (switch-to-window *driver* window))
  ([driver window]
     (core/switch-to-window driver window)))

(defn switch-to-other-window
  "If two windows are open, switch focus to the other.

   Examples:
   =========

   (switch-to-other-window)"
  ([] (switch-to-other-window *driver*))
  ([driver]
     (core/switch-to-other-window driver)))

(defn switch-to-default
  "Switch focus to the first first frame of the page, or the main document if the page contains iframes.

   Examples:
   =========

   (switch-to-default)"
  ([] (switch-to-default *driver*))
  ([driver]
     (core/switch-to-default driver)))

(defn switch-to-active
  "Switch to the page element that currently has focus, or to the body if this cannot be detected.

   Examples:
   =========

   (switch-to-active)"
  ([] (switch-to-active *driver*))
  ([driver]
     (core/switch-to-active driver)))

(defn add-cookie
  "Add a cookie to the browser session. The `cookie-spec` is a map which must contain `:name` and `:value` keys, and can also optionally include `:domain`, `:path`, `:expiry`, and `:secure?` (a boolean).

   Examples:
   =========

   ;;
   ;; Simple example
   ;;
   (add-cookie {:name \"foo\", :value \"bar\"})

   ;;
   ;; Full example
   ;;
   (add-cookie {:name \"foo\", :value \"bar\",
                :domain \"example.com\", :path \"a-path\",
                :expiry (java.util.Date.), :secure? false}) "
  ([cookie-spec] (add-cookie *driver* cookie-spec))
  ([driver cookie-spec]
     (options/add-cookie driver cookie-spec)))

(defn delete-cookie
  "Provided the name of a cookie or a Cookie record itself, delete it from the browser session.

   Examples:
   =========

   ;;
   ;; By name
   ;;
   (delete-cookie \"foo\")

   ;;
   ;; With `Cookie` record as returned by `cookies` or `cookie` functions
   ;;
   (delete-cookie a-cookie)"
  ([name-or-obj] (delete-cookie *driver* name-or-obj))
  ([driver name-or-obj]
     (if (string? name-or-obj)
       (options/delete-cookie-named driver name-or-obj)
       (options/delete-cookie driver name-or-obj))))

(defn delete-all-cookies
  "Delete all cookies from the browser session.

   Examples:
   =========

   (delete-all-cookies)"
  ([] (delete-all-cookies *driver*))
  ([driver]
     (options/delete-all-cookies driver)))

(defn cookies
  "Return a seq of all cookies in the browser session. Items are `Cookie` records, which themselves contain a `:cookie` field with the original Java objects.

   Examples:
   =========

   (cookies)"
  ([] (cookies *driver*))
  ([driver]
     (options/cookies driver)))

(defn cookie
  "Return the cookie with name `cookie-name`. Returns a `Cookie` record which contains a `:cookie` field with the original Java object.

   Examples:
   =========

   (cookie \"foo\")"
  ([cookie-name] (cookie *driver* cookie-name))
  ([driver cookie-name]
     (options/cookie-named driver cookie-name)))

(defn execute-script
  "Execute the JavaScript code `js` with arguments `js-args` which must be passed in as a vector (for arity reasons).

   Within the script, use document to refer to the current document. Note that local variables will not be available once the script has finished executing, though global variables will persist.

   If the script has a return value (i.e. if the script contains a return statement), then the following steps will be taken:

    * For an HTML element, this method returns a WebElement
    * For a decimal, a Double is returned
    * For a non-decimal number, a Long is returned
    * For a boolean, a Boolean is returned
    * For all other cases, a String is returned.
    * For an array, return a List<Object> with each object following the rules above. We support nested lists.
    * Unless the value is null or there is no return value, in which null is returned.

   Arguments must be a number, a boolean, a String, WebElement, or a List of any combination of the above. An exception will be thrown if the arguments do not meet these criteria. The arguments will be made available to the JavaScript via the 'arguments' magic variable, as if the function were called via 'Function.apply'

   See http://selenium.googlecode.com/svn/trunk/docs/api/java/org/openqa/selenium/remote/RemoteWebDriver.html#executeScript(java.lang.String, java.lang.Object...) for full details.

   Examples:
   =========

   ;;
   ;; Set a global variable
   ;;
   (execute-script \"window.document.title = 'asdf'\")

   ;;
   ;; Return an element. Note that this currently returns a raw WebElement Java object.
   ;;
   (execute-script \"var myElement = document.getElementById('elementId'); return myElement;\")"
  ([js] (execute-script *driver* js))
  ([driver-or-js js-or-args] (if (driver? driver-or-js)
                               (execute-script driver-or-js js-or-args [])
                               (execute-script *driver* driver-or-js js-or-args)))
  ([driver js js-args]
     (apply (partial core/execute-script driver js) js-args)))

(defn wait-until
  "Make the browser wait until the predicate `pred` returns true, providing an optional `timeout` in milliseconds and an optional `interval` in milliseconds on which to attempt the predicate. If the timeout is exceeded, an exception is thrown.

   The predicate is a function that accepts the browser `Driver` record as its single parameter, and should return a truthy/falsey value.

   Examples:
   =========

   ;;
   ;; Simple example (taken from unit tests)
   ;;
   ;; Wait until the title of the page is 'asdf'
   ;;
   (execute-script \"setTimeout(function () { window.document.title = 'asdf'}, 3000)\")
   (wait-until #(= (title) \"asdf\"))

   ;;
   ;; Wait until an element exists
   ;;
   (... code to load page ...)
   (wait-until #(exists? \"#foo\"))
   (click \"#foo a.bar\")"
  ([pred] (wait/wait-until *driver* (fn [_] pred)))
  ([pred timeout] (wait/wait-until *driver* (fn [_] pred) timeout))
  ([pred timeout interval] (wait/wait-until *driver* (fn [_] pred) timeout interval))
  ([driver pred timeout interval] (wait/wait-until driver pred timeout interval)))

(defn implicit-wait
  "Set the global `timeout` that the browser should wait when attempting to find elements on the page, before timing out with an exception.

   Examples:
   =========

   ;;
   ;; Simple example (taken from unit tests)
   ;;
   ;; Set implicit timeout (global) to 3 seconds, then execute JavaScript with a
   ;; noticeable delay to prove that it works
   ;;
   (implicit-wait 3000)
   (execute-script \"setTimeout(function () { window.document.body.innerHTML = '<div id='test'>hi!</div>'}, 1000)\")"
  ([timeout] (implicit-wait *driver* timeout))
  ([driver timeout]
     (wait/implicit-wait driver timeout)))

(defn find-windows
  "Return all `Window` records that match the given `attr-val` map.

   Attributes can be anything in a `Window` record (`:title` or `:url`) or you can pass an `:index` key and a number value to select a window by its open order.

   Examples:
   =========

   ;;
   ;; By name
   ;;
   (find-windows {:title \"Window Title\"})

   ;;
   ;; By URL
   ;;
   (find-windows {:url \"http://example.com/test-page\"})

   ;;
   ;; By index
   ;;
   (find-windows {:index 2})"
  ([attr-val] (find-windows *driver* attr-val))
  ([driver attr-val]
     (core/find-windows driver attr-val)))

(defn find-window
  "Return the first `Window` record that matches the given `attr-val` map.

   Attributes can be anything in a `Window` record (`:title` or `:url`) or you can pass an `:index` key and a number value to select a window by its open order.

   Examples:
   =========

   ;;
   ;; By name
   ;;
   (find-window {:title \"Window Title\"})

   ;;
   ;; By URL
   ;;
   (find-window {:url \"http://example.com/test-page\"})

   ;;
   ;; By index
   ;;
   (find-window {:index 2})"
  ([attr-val] (find-window *driver* attr-val))
  ([driver attr-val] (core/find-window driver attr-val)))

(defn find-table-cell
  "Within the table found with query `table-q`, return the table cell at coordinates `coords`. The top-left cell has coordinates `[0 0]`.

   Examples:
   =========

   ;;
   ;; Simple example, find 2nd cell on 2nd row from top
   ;;
   (find-table-cell \"table#my-table\" [1 1])"
  ([table-q coords] (find-table-cell *driver* table-q coords))
  ([driver table-q coords]
     (core/find-table-cell driver (element driver table-q) coords)))

(defn find-table-row
  "Within the table found with query `table-q`, return a seq of all cells at row number `row`. The top-most row is row `0` (zero-based index).

   Examples:
   =========

   ;;
   ;; Simple example, return cells in second row
   ;;
   (find-table-row \"table#my-table\" 1)"
  ([table-q row] (find-table-row *driver* table-q row))
  ([driver table-q row]
     (core/find-table-row driver (element driver table-q) row)))

;; Need to explain difference between element and find-element fn's
(defn find-elements
  "Return `Element` records that match the given `attr-val`. Prefer the default behavior of `elements` when possible.

   Whereas the `elements` function uses a query `q` with the default finder function, this function requires an `attr-val` parameter which is either a map or a vector of maps with special semantics for finding elements on the page.

   The `attr-val` map can consist of one or more of the following:

    * The key `:css` or `:xpath` and a query value (e.g., `{:css \"a.external\"}`)
    * The key `:tag` and an HTML tag (e.g., `{:tag :a}`)
    * An HTML element attribute and its value (e.g., `{:class \"external\"}`)
    * A 'meta' tag `:button*`, `:radio`, `:checkbox`, `:textfield`, `:password`, `:filefield` (e.g., `{:tag :button*}`)
    * The key `:index` and the zero-based index (order) of the target element on the page (e.g., `{:index 2}` retrieves the third element that matches)
    * A vector of attr-val maps like the above, representing a hierarchical query (auto-generates XPath)

   Examples:
   =========

   ;;
   ;; Medley of possibilities
   ;;
   (find-elements {:css \"a.foo\"})
   (find-elements {:xpath \"//a[@class='foo']\"})
   (find-elements {:tag :a, :text \"Login\"})
   (find-elements {:tag :a, :index 4}) ;; 5th anchor tag
   (find-elements {:tag :button*, :class \"foo\"})
   (find-elements {:tag :radio, :class \"choice\"})
   (find-elements [{:tag :div, :id \"container\"},
                   {:tag :a, :class \"external\"}])
"
  ([attr-val] (find-elements *driver* attr-val))
  ([driver attr-val]
     (core/find-elements driver attr-val)))

(defn find-element
  "Return first `Element` record that matches the given `attr-val`. Prefer the default behavior of `element` when possible.

   Whereas the `element` function uses a query `q` with the default finder function, this function requires an `attr-val` parameter which is either a map or a vector of maps with special semantics for finding elements on the page.

   The `attr-val` map can consist of one or more of the following:

    * The key `:css` or `:xpath` and a query value (e.g., `{:css \"a.external\"}`)
    * The key `:tag` and an HTML tag (e.g., `{:tag :a}`)
    * An HTML element attribute and its value (e.g., `{:class \"external\"}`)
    * A 'meta' tag `:button*`, `:radio`, `:checkbox`, `:textfield`, `:password`, `:filefield` (e.g., `{:tag :button*}`)
    * The key `:index` and the zero-based index (order) of the target element on the page (e.g., `{:index 2}` retrieves the third element that matches)
    * A vector of attr-val maps like the above, representing a hierarchical query (auto-generates XPath)

   Examples:
   =========

   ;;
   ;; Medley of possibilities
   ;;
   (find-element {:css \"a.foo\"})
   (find-element {:xpath \"//a[@class='foo']\"})
   (find-element {:tag :a, :text \"Login\"})
   (find-element {:tag :a, :index 4}) ;; 5th anchor tag
   (find-element {:tag :button*, :class \"foo\"})
   (find-element {:tag :radio, :class \"choice\"})
   (find-element [{:tag :div, :id \"container\"},
                  {:tag :a, :class \"external\"}])
"
  ([attr-val] (find-element *driver* attr-val))
  ([driver attr-val]
     (core/find-element driver attr-val)))


;; Element versions of find-element-by and find-elements-by
(defn find-elements-under
  "Find the elements that are children of the element found with query `q-parent`, using the given `attr-val`. If `q-parent` is an `Element`, it will be used as-is. The `attr-val` can either be a find-element-style map of attributes and values, or a by-clause (`by-tag`, `by-class`, etc.)


   Examples:
   =========

   ;;
   ;; Example using a map
   ;;
   (find-elements-under  \"div#container\" {:tag :a, :id \"foo\"})

   ;;
   ;; Example using by-clause, find an element with id \"foo\" within a div with id \"container\"
   ;;
   (find-elements-under \"div#container\" (core/by-id \"foo\")"
  ([q-parent attr-val] (find-elements-under *driver* q-parent attr-val))
  ([driver q-parent attr-val]
     (if (element-like? q-parent)
       (core/find-elements q-parent attr-val)
       (core/find-elements (element driver q-parent) attr-val))))

(defn find-element-under
  "Find the first element that is a child of the element found with query `q-parent`, using the given `attr-val`. If `q-parent` is an `Element`, it will be used as-is. The `attr-val` can either be a find-element-style map of attributes and values, or a by-clause (`by-tag`, `by-class`, etc.)

   Examples:
   =========

   ;;
   ;; Example using map, which generates a (by-xpath ...) form
   ;;
   (find-element-under  \"div#container\" {:tag :a, :id \"foo\"})

   ;;
   ;; Example using by-clause, find an element with id \"foo\" within a div with id \"container\"
   ;;
   (find-element-under \"div#container\" (core/by-id \"foo\")"
  ([q-parent attr-val] (find-element-under *driver* q-parent attr-val))
  ([driver q-parent attr-val]
     (if (element-like? q-parent)
       (core/find-element q-parent attr-val)
       (core/find-element (element driver q-parent) attr-val))))



;; ## Element functions ##
;;
;; Unlike their counterparts in core, you don't need to do a `(find-element ...)`
;; with these; just pass in a CSS query followed by other necessary parameters
;; and the first element that matches the query will be used automatically.
;;
;; If a CSS query string is not passed in, it's assumed you're trying to use these
;; functions like their core counterparts, in which case each function will default
;; back to core functionality (expecting that you're passing in an Element record)

(defn attribute
  "For the first element found with query `q`, return the value of the given `attribute`.

   Examples:
   =========

   ;;
   ;; Example medley for an anchor tag with id \"foo\", class \"bar\", and target \"_blank\"
   ;;
   (attribute \"a#foo\" :id)     ;=> \"foo\"
   (attribute \"a#foo\" :class)  ;=> \"bar\"
   (attribute \"a#foo\" :target) ;=> \"_blank\""
  ([q attr] (attribute *driver* q attr))
  ([driver q attr]
     (core/attribute (element driver q) attr)))

(defn click
  "Click the first element found with query `q`.

   Examples:
   =========

   (click \"a#foo\")"
  ([q] (click *driver* q))
  ([driver q]
     (core/click (element driver q))))

(defn displayed?
  "Return true if the first element found with query `q` is visible on the page.

   Examples:
   =========

   (displayed? \"div#container\") ;=> true
   (displayed? \"a.hidden\")      ;=> false"
  ([q] (displayed? *driver* q))
  ([driver q]
     (core/displayed? (element driver q))))

(defn drag-and-drop
  "Drag the first element found with query `qa` onto the first element found with query `qb`.

   Examples:
   =========

   ;;
   ;; Drag div with id \"draggable\" onto div with id \"droppable\"
   ;;
   (drag-and-drop \"#draggable\" \"#droppable\")"
  ([qa qb] (drag-and-drop *driver* qa qb))
  ([driver qa qb]
     (core/drag-and-drop driver (element driver qa) (element driver qb))))

(defn drag-and-drop-by
  "Drag the first element found with query `q` by `:x` pixels to the right and `:y` pixels down, passed in as a map like `{:x 10, :y 10}`. Values default to zero if excluded. Use negative numbers for `:x` and `:y` to move left or up respectively.

   Examples:
   =========

   ;;
   ;; Drag a div with id \"draggable\" 20 pixels to the right
   ;;
   (drag-and-drop-by \"#draggable\" {:x 20})

   ;;
   ;; Drag a div with id \"draggable\" 10 pixels down
   ;;
   (drag-and-drop-by \"#draggable\" {:y 10})

   ;;
   ;; Drag a div with id \"draggable\" 15 pixels to the left and 5 pixels up
   ;;
   (drag-and-drop-by \"#draggable\" {:x -15, :y -5})"
  ([q x-y-map] (drag-and-drop-by *driver* q x-y-map))
  ([driver q x-y-map]
     (core/drag-and-drop-by driver (element driver q) x-y-map)))

(defn exists?
  "Return true if the first element found with query `q` exists on the current page in the browser.

   Examples:
   =========

   (exists? \"a#foo\")   ;=> true
   (exists? \"footer\")  ;=> false"
  ([q] (exists? *driver* q))
  ([driver q]
     (core/exists? (element driver q))))

(defn flash
  "Flash the background color of the first element found with query `q`.

   Examples:
   =========

   (flash \"a.hard-to-see\")"
  ([q] (flash *driver* q))
  ([driver q]
     (core/flash (element driver q))))

(defn focus
  "Explicitly give the first element found with query `q` focus on the page.

   Examples:
   =========

   (focus \"input.next-element\")"
  ([q] (focus *driver* q))
  ([driver q]
     (core/focus (element driver q))))

(defn html
  "Return the inner html of the first element found with query `q`.

   Examples:
   =========

   (html \"div.with-interesting-html\")"
  ([q] (html *driver* q))
  ([driver q]
     (core/html (element driver q))))

(defn location
  "Return a map of `:x` and `:y` coordinates for the first element found with query `q`.

   Examples:
   =========

   (location \"a#foo\") ;=> {:x 240, :y 300}"
  ([q] (location *driver* q))
  ([driver q]
     (core/location (element driver q))))

(defn location-once-visible
  "Return a map of `:x` and `:y` coordinates for the first element found with query `q` once the page has been scrolled enough to be visible in the viewport.

   Examples:
   =========

   (location-once-visible \"a#foo\") ;=> {:x 240, :y 300}"
  ([q] (location-once-visible *driver* q))
  ([driver q]
     (core/location-once-visible (element driver q))))

(defn present?
  "Return true if the first element found with query `q` both exists and is visible on the page.

   Examples:
   =========

   (present? \"div#container\")        ;=> true
   (present? \"a#skip-to-navigation\") ;=> false"
  ([q] (present? *driver* q))
  ([driver q]
     (core/present? (element driver q))))

(defn element-size
  "Return the size of the first element found with query `q` in pixels as a map of `:width` and `:height`.

   Examples:
   =========

   (size \"div#container\") ;=> {:width 960, :height 2000} "
  ([q] (element-size *driver* q))
  ([driver q]
     (core/size (element driver q))))

(defn intersects?
  "Return true if the first element found with query `qa` intersects with the first element found with query `qb`.

   Examples:
   =========

   (intersect? \"#login\" \"#login_field\")    ;=> true
   (intersect? \"#login_field\" \"#password\") ;=> false"
  ([qa qb] (intersects? *driver* qa qb))
  ([driver qa qb]
     (core/intersects? (element driver qa) (element driver qb))))

(defn tag
  "Return the HTML tag for the first element found with query `q`.

   Examples:
   =========

   (tag \"#foo\") ;=> \"a\""
  ([q] (tag *driver* q))
  ([driver q]
     (core/tag (element driver q))))

(defn text
  "Return the text within the first element found with query `q`.

   Examples:
   =========

   (text \"#message\") ;=> \"An error occurred.\""
  ([q] (text *driver* q))
  ([driver q]
     (core/text (element driver q))))

(defn value
  "Return the value of the HTML value attribute for the first element found with query `q`. The is identical to `(attribute q :value)`

   Examples:
   =========

   (value \"#my-button\") ;=> \"submit\" "
  ([q] (value *driver* q))
  ([driver q]
     (core/value (element driver q))))

(defn visible?
  "Return true if the first element found with query `q` is visible on the current page in the browser.

   Examples:
   =========

   (visible? \"div#container\") ;=> true
   (visible? \"a.hidden\")      ;=> false"
  ([q] (visible? *driver* q))
  ([driver q]
     (core/visible? (element driver q))))

(defn xpath
  "Return an absolute XPath path for the first element found with query `q`. NOTE: This function relies on executing JavaScript in the browser, and is therefore not as dependable as other functions.

   Examples:
   =========

   (xpath \"#login_field\") ;=> \"/html/body/div[2]/div/div/form/div[2]/label/input\""
  ([q] (xpath *driver* q))
  ([driver q]
     (core/xpath (element driver q))))

(defn deselect
  "If the first form element found with query `q` is selected, click the element to deselect it. Otherwise, do nothing and just return the element found.

   Examples:
   =========

   (deselect \"input.already-selected\") ;=> click
   (deselect \"input.not-selected\")     ;=> do nothing"
  ([q] (deselect *driver* q))
  ([driver q]
     (core/deselect (element driver q))))

(defn enabled?
  "Return true if the first form element found with query `q` is enabled (not disabled).

   Examples:
   =========

   (enabled? \"input\")                      ;=> true
   (enabled? \"input[disabled='disabled']\") ;=> false"
  ([q] (enabled? *driver* q))
  ([driver q] (core/enabled? (element driver q))))

(defn input-text
  "Type the string `s` into the first form element found with query `q`.

   Examples:
   =========

   (input-text \"input#login_field\" \"semperos\")"
  ([q s] (input-text *driver* q s))
  ([driver q s]
     (core/input-text (element driver q) s)))

(defn submit
  "Submit the form that the first form element found with query `q` belongs to (this is equivalent to pressing ENTER in a text field while filling out a form).

   Examples:
   =========

   (submit \"input#password\")"
  ([q] (submit *driver* q))
  ([driver q]
     (core/submit (element driver q))))

(defn clear
  "Clear the contents (the HTML value attribute) of the first form element found with query `q`.

   Examples:
   =========

   (clear \"input.with-default-text\")"
  ([q] (clear *driver* q))
  ([driver q]
     (core/clear (element driver q))))

(defn select
  "If the first form element found with query `q` is not selected, click the element to select it. Otherwise, do nothing and just return the element found.

   Examples:
   =========

   (select \"input.already-selected\") ;=> do nothing
   (select \"input.not-selected\")     ;=> click"
  ([q] (select *driver* q))
  ([driver q]
     (core/select (element driver q))))

(defn selected?
  "Return true if the first element found with the query `q` is selected (works for radio buttons, checkboxes, and option tags within select lists).

   Examples:
   =========

   (selected? \"input[type='radio'][value='foo']\") ;=> true
   (selected? \"option[value='foo']\")              ;=> false "
  ([q] (selected? *driver* q))
  ([driver q] (core/selected? (element driver q))))

(defn send-keys
  "Type the string `s` into the first form element found with query `q`.

   Examples:
   =========

   (input-text \"input#login_field\" \"semperos\")"
  ([q s] (send-keys *driver* q s))
  ([driver q s]
     (core/send-keys (element driver q) s)))

(defn toggle
  "Toggle is a synonym for click. Click the first element found with query `q`.

   Examples:
   =========

   (toggle \"input[type='checkbox'][value='foo']\")"
  ([q] (toggle *driver* q))
  ([driver q]
     (core/toggle (element driver q))))

(defn options
  "Return all option elements within the first select list found with query `q`.

   Examples:
   =========

   (options \"#my-select-list\")"
  ([q] (options *driver* q))
  ([driver q]
     (core/all-options (element driver q))))

(defn selected-options
  "Return all selected option elements within the first select list found with query `q`.

   Examples:
   =========

   (selected-options \"#my-select-list\")"
  ([q] (selected-options *driver* q))
  ([driver q]
     (core/all-selected-options (element driver q))))

(defn deselect-option
  "Deselect the option element matching `attr-val` within the first select list found with query `q`.

   The `attr-val` can contain `:index`, `:value`, or `:text` keys to find the target option element. Index is the zero-based order of the option element in the list, value is the value of the HTML value attribute, and text is the visible text of the option element on the page.

   Examples:
   =========

   ;;
   ;; By index, select 3rd option element
   ;;
   (deselect-option \"#my-select-list\" {:index 2})

   ;;
   ;; By value of option element
   ;;
   (deselect-option \"#my-select-list\" {:value \"foo\"})

   ;;
   ;; By visible text of option element
   ;;
   (deselect-option \"#my-select-list\" {:value \"Foo\"})"
  ([q attr-val] (deselect-option *driver* q attr-val))
  ([driver q attr-val]
     (core/deselect-option (element driver q) attr-val)))

(defn deselect-all
  "Deselect all options within the first select list found with query `q`.

   Examples:
   =========

   (deselect-all \"#my-select-list\")"
  ([q] (deselect-all *driver* q))
  ([driver q] (core/deselect-all (element driver q))))

(defn deselect-by-index
  "Deselect the option element at index `idx` (zero-based) within the first select list found with query `q`.

   Examples:
   =========

   ;;
   ;; Deselect by index, deselect 2nd element
   ;;
   (deselect-by-index \"#my-select-list\" 1)"
  ([q idx] (deselect-by-index *driver* q idx))
  ([driver q idx] (core/deselect-by-index (element driver q) idx)))

(defn deselect-by-text
  "Deselect the option element with visible text `text` within the first select list found with query `q`.

   Examples:
   =========

   (deselect-by-text \"#my-select-list\" \"Foo\")"
  ([q text] (deselect-by-text *driver* q text))
  ([driver q text]
     (core/deselect-by-text (element driver q) text)))

(defn deselect-by-value
  "Deselect the option element with `value` within the first select list found with query `q`.

   Examples:
   =========

   (deselect-by-value \"#my-select-list\" \"foo\")"
  ([q value] (deselect-by-value *driver* q value))
  ([driver q value]
     (core/deselect-by-value (element driver q) value)))

(defn multiple?
  "Return true if the first select list found with query `q` allows multiple selections.

   Examples:
   =========

   (multiple? \"select.multiple\")     ;=> true
   (multiple? \"select.not-multiple\") ;=> false "
  ([q] (multiple? *driver* q))
  ([driver q] (core/multiple? (element driver q))))

(defn select-option
  "Select the option element matching `attr-val` within the first select list found with query `q`.

   The `attr-val` can contain `:index`, `:value`, or `:text` keys to find the target option element. Index is the zero-based order of the option element in the list, value is the value of the HTML value attribute, and text is the visible text of the option element on the page.

   Examples:
   =========

   ;;
   ;; By index, select 3rd option element
   ;;
   (select-option \"#my-select-list\" {:index 2})

   ;;
   ;; By value of option element
   ;;
   (select-option \"#my-select-list\" {:value \"foo\"})

   ;;
   ;; By visible text of option element
   ;;
   (select-option \"#my-select-list\" {:value \"Foo\"})"
  ([q attr-val] (select-option *driver* q attr-val))
  ([driver q attr-val]
     (core/select-option (element driver q) attr-val)))

(defn select-all
  "Select all options within the first select list found with query `q`.

   Examples:
   =========

   (deselect-all \"#my-select-list\")"
  ([q] (select-all *driver* q))
  ([driver q]
     (core/select-all (element driver q))))

(defn select-by-index
  "Select the option element at index `idx` (zero-based) within the first select list found with query `q`.

   Examples:
   =========

   ;;
   ;; Select by index, select 2nd element
   ;;
   (select-by-index \"#my-select-list\" 1)"
  ([q idx] (select-by-index *driver* q idx))
  ([driver q idx]
     (core/select-by-index (element driver q) idx)))

(defn select-by-text
  "Select the option element with visible text `text` within the first select list found with query `q`.

   Examples:
   =========

   (select-by-text \"#my-select-list\" \"foo\")"
  ([q text] (select-by-text *driver* q text))
  ([driver q text]
     (core/select-by-text (element driver q) text)))

(defn select-by-value
  "Select the option element with `value` within the first select list found with query `q`.

   Examples:
   =========

   (select-by-value \"#my-select-list\" \"foo\")"
  ([q value] (select-by-value *driver* q value))
  ([driver q value]
     (core/select-by-value (element driver q) value)))

;; Helpers
(defn- quick-fill*
  ([k v] (quick-fill* k v false))
  ([k v submit?]
     ;; shortcuts:
     ;; v as string => text to input
     (let [q k
           action (if (string? v)
                    #(input-text % v)
                    v)
           target-els (elements q)]
       (if submit?
         (doseq [el target-els]
           (action el))
         (map action target-els)))))

(defn quick-fill
  "A utility for filling out multiple fields in a form in one go. Returns all the affected elements (if you want a list of unique elements, pass the results through the `distinct` function in clojure.core).

   `query-action-maps`   - a seq of maps of queries to actions (queries find HTML elements, actions are fn's that act on them)

   Note that an \"action\" that is just a String will be interpreted as a call to `input-text` with that String for the target text field.

   Examples:
   =========

   (quick-fill {\"#first_name\" \"Rich\"}
               {\"a.foo\" click})"
  [& query-action-maps]
  (flatten (map (fn [a-map]
                  (let [[k v] (first a-map)] (quick-fill* k v)))
                query-action-maps)))

(defn quick-fill-submit
  "A utility for filling out multiple fields in a form in one go. Always returns nil instead of the affected elements, since on submit all of the elements will be void.

   `query-action-maps`   - a seq of maps of queries to actions (queries find HTML elements, actions are fn's that act on them)

   Note that an \"action\" that is just a String will be interpreted as a call to `input-text` with that String for the target text field.

   Examples:
   =========

   (quick-fill {\"#first_name\" \"Rich\"}
               {\"a.foo\" click})"
  [& query-action-maps]
  (doseq [entry query-action-maps
          [k v] entry]
    (quick-fill* k v true)))

(defn accept
  "Accept an alert popup dialog. Equivalent to pressing its 'Ok' button."
  ([] (accept *driver*))
  ([driver] (core/accept driver)))

(defn alert-obj
  "Retrieve the underlying Java object used to identify an alert popup dialog. Exposed to allow you to use methods not yet exposed via clj-webdriver's API's."
  ([] (alert-obj *driver*))
  ([driver] (core/alert-obj driver)))

(defn alert-text
  "Get the text of the alert popup dialog's message."
  ([] (alert-text *driver*))
  ([driver] (core/alert-text driver)))

(defn dismiss
  "Dismiss the alert popup dialog. Equivalent to pressing its 'Cancel' button."
  ([] (dismiss *driver*))
  ([driver] (core/dismiss driver)))

(defn window-position
  "Get the position of the top-left corner of the browser's window relative to the top-left corner of your primary display, returned as a map of `:x` and `:y` integers.

   Examples:
   =========

   (window-position)"
  ([] (window-position *driver*))
  ([driver] (win/position driver)))

(defn window-reposition
  "Move the top-left corner of the browser `:x` pixels to the right and `:y` pixels down from the top-left of your primary display. If you do not provide a coordinate, it's current value for the browser position will not be changed.

   Examples:
   =========

   (window-reposition {:x 25, :y 50})
   (window-reposition {:y 50})"
  ([coordinates-map] (window-reposition *driver* coordinates-map))
  ([driver {:keys [x y] :as coordinates-map}]
     (win/reposition driver coordinates-map)))

(defn window-size
  "Get the size of the browser's window in pixels, returned as a map of `:width` and `:height`.

   Examples:
   =========

   (window-size)"
  ([] (window-size *driver*))
  ([driver] (win/size driver)))

(defn window-resize
  "Resize the browser window to the given `:width` and `:height`. If a dimension is not specified, it's current value for the browser size will not be changed.

   Examples:
   =========

   (window-resize {:width 300 :height 400})
   (window-resize {:height 400})"
  ([dimensions-map] (window-resize *driver* dimensions-map))
  ([driver {:keys [width height] :as dimensions-map}]
     (win/resize driver dimensions-map)))

(defn window-maximize
  "Maximize the browser window.

   Examples:
   =========

   (window-maximize)"
  ([] (window-maximize *driver*))
  ([driver] (win/maximize driver)))
