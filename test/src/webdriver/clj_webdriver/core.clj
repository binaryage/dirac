;; # Clojure API for Selenium-WebDriver #
;;
;; WebDriver is a library that allows for easy manipulation of the Firefox,
;; Chrome, Safari and  Internet Explorer graphical browsers, as well as the
;; Java-based HtmlUnit headless browser.
;;
;; This library provides both a thin wrapper around WebDriver and a more
;; Clojure-friendly API for finding elements on the page and performing
;; actions on them. See the README for more details.
;;
;; Credits to mikitebeka's `webdriver-clj` project on Github for a starting-
;; point for this project and many of the low-level wrappers around the
;; WebDriver API.
;;
(ns clj-webdriver.core
  (:use [clj-webdriver cookie driver element options util]
        [clojure.walk :only [keywordize-keys]])
  (:require [clj-webdriver.cache :as cache]
            clj-webdriver.driver
            [clj-webdriver.firefox :as ff]
            [clj-webdriver.js.browserbot :as browserbot-js]
            [clj-webdriver.window :as win]
            [clojure.java.io :as io]
            [clojure.string :as string]
            [clojure.tools.logging :as log])
  (:import clj_webdriver.driver.Driver
           clj_webdriver.element.Element
           java.lang.reflect.Constructor
           [org.openqa.selenium By Keys NoSuchElementException
                                OutputType WebDriver WebElement]
           org.openqa.selenium.Capabilities
           org.openqa.selenium.chrome.ChromeDriver
           org.openqa.selenium.firefox.FirefoxDriver
           org.openqa.selenium.htmlunit.HtmlUnitDriver
           org.openqa.selenium.ie.InternetExplorerDriver
           [org.openqa.selenium.interactions Actions CompositeAction]
           org.openqa.selenium.remote.DesiredCapabilities
           org.openqa.selenium.support.ui.Select
))

;; ## Protocols for clj-webdriver API ##

;; ### Driver/Browser Functions ###
(defprotocol IDriver
  "Basics of driver handling"
  (back [driver] "Go back to the previous page in \"browsing history\"")
  (close [driver] "Close this browser instance, switching to an active one if more than one is open")
  (current-url [driver] "Retrieve the URL of the current page")
  (forward [driver] "Go forward to the next page in \"browsing history\".")
  (get-screenshot [driver] [driver format] [driver format destination] "Take a screenshot using Selenium-WebDriver's getScreenshotAs method")
  (get-url [driver url] "Navigate the driver to a given URL")
  (page-source [driver] "Retrieve the source code of the current page")
  (quit [driver] "Destroy this browser instance")
  (refresh [driver] "Refresh the current page")
  (title [driver] "Retrieve the title of the current page as defined in the `head` tag")
  (to [driver url] "Navigate to a particular URL. Arg `url` can be either String or java.net.URL. Equivalent to the `get` function, provided here for compatibility with WebDriver API."))

;; ### Windows and Frames ###
(defprotocol ITargetLocator
  "Functions that deal with browser windows and frames"
  (window [driver] "Get the only (or first) window")
  (windows [driver] "Retrieve a vector of `Window` records which can be used to switch to particular open windows")
  (other-windows [driver] "Retrieve window handles for all windows except the current one")
  (switch-to-frame [driver frame] "Switch focus to a particular HTML frame by supplying an `Element` or an integer for the nth frame on the page (zero-based index)")
  (switch-to-window [driver handle] "Switch focus to a particular open window")
  (switch-to-other-window [driver] "Given that two and only two browser windows are open, switch to the one not currently active")
  (switch-to-default [driver] "Switch focus to the first first frame of the page, or the main document if the page contains iframes")
  (switch-to-active [driver] "Switch to element that currently has focus, or to the body if this cannot be detected"))

;; ### Alert Popups ###
(defprotocol IAlert
  "Simple interactions with alert popups"
  (accept [driver] "Accept the dialog. Equivalent to pressing 'Ok'")
  (alert-obj [driver] "Return the underlying Java object that can be used with the Alert Java API (exposed until all functionality is ported)")
  (alert-text [driver] "Get the text of the popup dialog's message")
  ;; (authenticate-using [driver username password] "Enter `username` and `password` into fields from a Basic Access Authentication popup dialog")
  (dismiss [driver] "Dismiss the dialog. Equivalent to pressing 'Cancel'"))

;; ### Finding Elements on Page ###
(defprotocol IFind
  "Functions used to locate elements on a given page"
  (find-element-by [this by] "Retrieve the element object of an element described by `by`, optionally limited to elements beneath a parent element (depends on dispatch). Prefer `find-element` to this function unless you know what you're doing.")
  (find-elements-by [this by] "Retrieve a seq of element objects described by `by`, optionally limited to elements beneath a parent element (depends on dispatch). Prefer `find-elements` to this function unless you know what you're doing.")
  (find-windows [driver attr-val] "Given a browser `driver` and a map of attributes, return the windows that match")
  (find-window [driver attr-val] "Given a browser `driver` and a map of attributes, return the windows that match")
  (find-table-cell [driver table coordinates] "Given a `driver`, a `table` element, and a zero-based set of coordinates for row and column, return the table cell at those coordinates for the given table.")
  (find-table-row [driver table row-index] "Return all cells in the row of the given table element, `row-index` as a zero-based index of the target row.")
  (find-by-hierarchy [driver hierarchy-vector] "Given a Webdriver `driver` and a vector `hierarchy-vector`, return a lazy seq of the described elements in the hierarchy dictated by the order of elements in the `hierarchy-vector`.")
  (find-elements [this locator] "Find all elements that match the parameters supplied in the `attr-val` map. Also provides a shortcut to `find-by-hierarchy` if a vector is supplied instead of a map.")
  (find-element [this locator] "Call (first (find-elements args))"))

;; ### Acting on Elements ###
(defprotocol IElement
  "Basic actions on elements"
  (attribute [element attr] "Retrieve the value of the attribute of the given element object")
  (click [element] "Click a particular HTML element")
  (css-value [element property] "Return the value of the given CSS property")
  (displayed? [element] "Returns true if the given element object is visible/displayed")
  (exists? [element] "Returns true if the given element exists")
  (flash [element] "Flash the element in question, to verify you're looking at the correct element")
  (focus [element] "Apply focus to the given element")
  (html [element] "Retrieve the outer HTML of an element")
  (intersects? [element-a element-b] "Return true if `element-a` intersects with `element-b`. This mirrors the Selenium-WebDriver API method, but see the `intersect?` function to compare an element against multiple other elements for intersection.")
  (location [element] "Given an element object, return its location as a map of its x/y coordinates")
  (location-once-visible [element] "Given an element object, return its location on the screen once it is scrolled into view as a map of its x/y coordinates. The window will scroll as much as possible until the element hits the top of the page; thus even visible elements will be scrolled until they reach that point.")
  (present? [element] "Returns true if the element exists and is visible")
  (size [element] "Return the size of the given `element` as a map containing `:width` and `:height` values in pixels.")
  (tag [element] "Retrieve the name of the HTML tag of the given element object (returned as a keyword)")
  (text [element] "Retrieve the content, or inner HTML, of a given element object")
  (value [element] "Retrieve the `value` attribute of the given element object")
  (visible? [element] "Returns true if the given element object is visible/displayed")
  (xpath [element] "Retrieve the XPath of an element"))

;; ### Acting on Form-Specific Elements ###
(defprotocol IFormElement
  "Actions for form elements"
  (clear [element] "Clear the contents of the given element object")
  (deselect [element] "Deselect a given element object")
  (enabled? [element] "Returns true if the given element object is enabled")
  (input-text [element s] "Type the string of keys into the element object")
  (submit [element] "Submit the form which contains the given element object")
  (select [element] "Select a given element object")
  (selected? [element] "Returns true if the given element object is selected")
  (send-keys [element s] "Type the string of keys into the element object")
  (toggle [element] "If the given element object is a checkbox, this will toggle its selected/unselected state. In Selenium 2, `.toggle()` was deprecated and replaced in usage by `.click()`."))

;; ### Acting on Select Elements ###
(defprotocol ISelectElement
  "Actions specific to select lists"
  (all-options [select-element] "Retrieve all options from the given select list")
  (all-selected-options [select-element] "Retrieve a seq of all selected options from the select list described by `by`")
  (deselect-option [select-element attr-val] "Deselect an option from a select list, either by `:value`, `:index` or `:text`")
  (deselect-all [select-element] "Deselect all options for a given select list. Does not leverage WebDriver method because WebDriver's isMultiple method is faulty.")
  (deselect-by-index [select-element idx] "Deselect the option at index `idx` for the select list described by `by`. Indeces begin at 0")
  (deselect-by-text [select-element text] "Deselect all options with visible text `text` for the select list described by `by`")
  (deselect-by-value [select-element value] "Deselect all options with value `value` for the select list described by `by`")
  (first-selected-option [select-element] "Retrieve the first selected option (or the only one for single-select lists) from the given select list")
  (multiple? [select-element] "Return true if the given select list allows for multiple selections")
  (select-option [select-element attr-val] "Select an option from a select list, either by `:value`, `:index` or `:text`")
  (select-all [select-element] "Select all options for a given select list")
  (select-by-index [select-element idx] "Select an option by its index in the given select list. Indeces begin at 0.")
  (select-by-text [select-element text] "Select all options with visible text `text` in the select list described by `by`")
  (select-by-value [select-element value] "Select all options with value `value` in the select list described by `by`"))

(defprotocol IActions
  "Methods available in the Actions class"
  (click-and-hold
    [this]
    [this element] "Drag and drop, either at the current mouse position or in the middle of a given `element`.")
  (double-click
    [this]
    [this element] "Double click, either at the current mouse position or in the middle of a given `element`.")
  (drag-and-drop [this element-a element-b] "Drag and drop `element-a` onto `element-b`.")
  (drag-and-drop-by [this element x-y-map] "Drag `element` by `x` pixels to the right and `y` pixels down.")
  (key-down
    [this k]
    [this element k] "Press the given key (e.g., (key-press driver :enter))")
  (key-up
    [this k]
    [this element k] "Release the given key (e.g., (key-press driver :enter))")
  (move-by-offset [driver x y] "Move mouse by `x` pixels to the right and `y` pixels down.")
  (move-to-element
    [this element]
    [this element x y] "Move the mouse to the given element, or to an offset from the given element.")
  (perform [this] "Perform the composite action chain.")
  (release
    [this]
    [this element] "Release the left mouse button, either at the current mouse position or in the middle of the given `element`."))


;; ## Starting Driver/Browser ##
(def ^{:doc "Map of keywords to available WebDriver classes."}
  webdriver-drivers
  {:firefox FirefoxDriver
   :ie InternetExplorerDriver
   :internet-explorer InternetExplorerDriver
   :chrome ChromeDriver
   :chromium ChromeDriver
   :htmlunit HtmlUnitDriver})

(def phantomjs-enabled?
  (try
    (import '[org.openqa.selenium.phantomjs PhantomJSDriver PhantomJSDriverService])
    true
    (catch Throwable _ false)))

(defmulti new-webdriver
  "Return a Selenium-WebDriver WebDriver instance, with particularities of each browser supported."
  :browser)

(defmethod new-webdriver :default
  [{:keys [browser]}]
  ;; Allow driver classes unknown to this library as a fallback
  (.newInstance (or (browser webdriver-drivers) browser)))

(defmethod new-webdriver :firefox
  [{:keys [browser profile]}]
  (if profile
    (FirefoxDriver. profile)
    (FirefoxDriver.)))

(defmethod new-webdriver :phantomjs
  [{:keys [javascript-enabled? phantomjs-executable takes-screenshot?] :as browser-spec}]
  (if-not phantomjs-enabled?
    (throw (RuntimeException. "You do not have the PhantomJS JAR's on the classpath. Please add com.codeborne/phantomjsdriver version 1.2.1 with exclusions for org.seleniumhq.selenium/selenium-java and any other org.seleniumhq.selenium JAR's your code relies on."))
    (let [caps (DesiredCapabilities.)
          klass (Class/forName "org.openqa.selenium.phantomjs.PhantomJSDriver")
          ;; Second constructor takes single argument of Capabilities
          ctors (into [] (.getDeclaredConstructors klass))
          ctor-sig (fn [ctor]
                     (let [param-types (.getParameterTypes ctor)]
                       (and (= (alength param-types) 1)
                            (= Capabilities (aget param-types 0)))))
          phantomjs-driver-ctor (first (filterv ctor-sig ctors))]
      ;; Default is true
      (when-not javascript-enabled?
        (.setJavascriptEnabled caps false))
      (when takes-screenshot?
        (.setCapability caps "takesScreenshot" true))
      ;; Seems to be able to find it if on PATH by default, like Chrome's driver
      (when phantomjs-executable
        (let [klass (Class/forName "org.openqa.selenium.phantomjs.PhantomJSDriverService")
              field (.getField klass "PHANTOMJS_EXECUTABLE_PATH_PROPERTY")]
          (.setCapability caps
                          (.get field klass)
                          phantomjs-executable)))
      (.newInstance phantomjs-driver-ctor (into-array java.lang.Object [caps]))
)))

(defn new-driver
  "Start a new Driver instance. The `browser-spec` can include `:browser`, `:profile`, and `:cache-spec` keys.

   The `:browser` can be one of `:firefox`, `:ie`, `:chrome`, `:phantomjs` or `:htmlunit`.
   The `:profile` should be an instance of FirefoxProfile you wish to use.
   The `:cache-spec` can contain `:strategy`, `:args`, `:include` and/or `:exclude keys. See documentation on caching for more details."
  ([browser-spec]
     (let [{:keys [browser profile cache-spec] :or {browser :firefox
                                                    profile nil
                                                    cache-spec {}}} browser-spec]

       (init-driver {:webdriver (new-webdriver (merge {:browser browser
                                                       :profile profile}
                                                      browser-spec))
                     :cache-spec cache-spec}))))

;; Chrome binary, common location of Chromium on Linux
(comment
  (do
    (import 'org.openqa.selenium.remote.DesiredCapabilities)
    (let [cap (DesiredCapabilities/chrome)]
      (.setCapability cap "chrome.binary" "/usr/lib/chromium-browser/chromium-browser")
      (init-driver (ChromeDriver. cap))))
)

(defn start
  "Shortcut to instantiate a driver, navigate to a URL, and return the driver for further use"
  ([browser-spec url]
     (let [driver (new-driver browser-spec)]
       (get-url driver url)
       driver)))

;; Borrowed from core Clojure
(defmacro with-driver
  "bindings => [name init ...]

  Evaluates body in a try expression with names bound to the values
  of the inits, and a finally clause that calls (.close name) on each
  name in reverse order."
  [bindings & body]
  (assert-args
     (vector? bindings) "a vector for its binding"
     (even? (count bindings)) "an even number of forms in binding vector")
  (cond
    (zero? (count bindings)) `(do ~@body)
    (symbol? (bindings 0)) `(let ~(subvec bindings 0 2)
                              (try
                                (with-driver ~(subvec bindings 2) ~@body)
                                (finally
                                  (quit ~(bindings 0)))))
    :else (throw (IllegalArgumentException.
                   "with-driver only allows Symbols in bindings"))))

;; alias for with-driver
(defmacro with-browser
  "Alias for with-driver

  bindings => [name init ...]

  Evaluates body in a try expression with names bound to the values
  of the inits, and a finally clause that calls (.close name) on each
  name in reverse order."
  [& args]
  `(with-driver ~@args))

;; These are used in the implementation of higher-level window functions
(defn window-handle*
  "For WebDriver API compatibility: this simply wraps `.getWindowHandle`"
  [driver]
  (.getWindowHandle driver))

(defn window-handles*
  "For WebDriver API compatibility: this simply wraps `.getWindowHandles`"
  [driver]
  (lazy-seq (.getWindowHandles driver)))

(defn other-window-handles*
  "For consistency with other window handling functions, this starred version just returns the string-based ID's that WebDriver produces"
  [driver]
  (remove #(= % (window-handle* driver))
          (doall (window-handles* driver))))

(load "core_by")

;; ##  Actions on WebElements ##
(declare execute-script)
(declare execute-script*)
(defn- browserbot
  [driver fn-name & arguments]
  (let [script (str browserbot-js/script
                    "return browserbot."
                    fn-name
                    ".apply(browserbot, arguments)")
        execute-js-fn (partial execute-script* driver script)]
    (apply execute-js-fn arguments)))

;; Implementations of the above IElement and IFormElement protocols
(load "core_element")

;; Key codes for non-representable keys
(defn key-code
  "Representations of pressable keys that aren't text. These are stored in the Unicode PUA (Private Use Area) code points, 0xE000-0xF8FF. Refer to http://www.google.com.au/search?&q=unicode+pua&btnG=Search"
  [k]
  (Keys/valueOf (.toUpperCase (name k))))

;; ## JavaScript Execution ##
(defn execute-script
  [driver js & js-args]
  (.executeScript (:webdriver driver) js (to-array js-args)))

(defn execute-script*
  "Version of execute-script that uses a WebDriver instance directly."
  [driver js & js-args]
  (.executeScript driver js (to-array js-args)))

(load "core_driver")

;; TODO: test coverage
(defmacro ->build-composite-action
  "Create a composite chain of actions, then call `.build()`. This does **not** execute the actions; it simply sets up an 'action chain' which can later by executed using `.perform()`.

   Unless you need to wait to execute your composite actions, you should prefer `->actions` to this macro."
  [driver & body]
  `(let [acts# (doto (:actions ~driver)
                 ~@body)]
     (.build acts#)))

;; TODO: test coverage
(defmacro ->actions
  [driver & body]
  `(let [act# (:actions ~driver)]
     (doto act#
       ~@body
       .perform)
     ~driver))

;; e.g.
;; Action dragAndDrop = builder.clickAndHold(someElement)
;;       .moveToElement(otherElement)
;;       .release(otherElement)
;;       .build()
