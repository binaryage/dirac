(ns dirac.runtime.bootstrap
  (:require [clojure.browser.repl :as brepl]))

; boostrap must be called after document finishes loading, because there may be some code coming after the bootstrap call
; which expects goog.require to work synchronously, like @bendlas discovered

(def ^:dynamic *boostrapped?* false)
(def ^:dynamic *boostrap-timeout* 100)
(def ^:dynamic *boostrap-listeners* (array))                                                                                  ; a native array of plain functions

; -- async bootstrap wrapper ------------------------------------------------------------------------------------------------

(defn notify-listeners! [listeners]
  (doseq [listener listeners]
    (listener)))

(defn boostrap-if-needed! []
  (when-not *boostrapped?*
    (brepl/bootstrap)
    (set! *boostrapped?* true))
  (notify-listeners! *boostrap-listeners*)
  (set! *boostrap-listeners* (array)))

(defn call-after-document-finished-loading [f timeout]
  ; Our strategy:
  ;   If document is already loaded, we simply execute our function.
  ;   If not, we try to schedule another check with timeout 0ms (fast path).
  ;   If still not loaded, we repeatedly schedule future checks with timeout 100ms (until loaded).
  ;   The magic constant *boostrap-timeout* (100ms) should be good enough for our bootstrapping use-case:
  ;     1. we don't want to starve event queue in case of slow loading, hence non-zero timeouts
  ;     2. but we also want to minimize the risk of potentially missing first eval request expecting bootstrapped env
  ;        note: our own `evaluate-javascript` has a guard, but there could be some other code doing their own evals
  ;
  ; We use polling here because we cannot assume anything about user's code.
  ; We do not want to hook DOMContentLoaded or onreadystatechange events which could interfere with user's own handlers.
  ;
  (if (= (.-readyState js/document) "loading")
    (js/setTimeout #(call-after-document-finished-loading f *boostrap-timeout*) timeout)
    (f)))

(defn bootstrap!
  "Reusable browser REPL bootstrapping. Patches the essential functions
  in goog.base to support re-loading of namespaces after page load.

  Note that this function might do its job asynchronously if at the time of calling the document is still loading.
  You may provide a callback which will be called immediatelly after bootstrapping happens.
  It has no effect if called after bootstrapping has been already done. Only the callback is called immediatelly."
  ([] (bootstrap! nil))
  ([callback]
    ; patching goog methods before document finished loading can unexpectedly break following goog.require code:
    ; `<script>goog.require("foo.bar");</script><script>foo.bar.some()</script>`
    ; It doesn't work as expected any more, as described here: https://developers.google.com/closure/library/docs/gettingstarted#wha
   (when (some? callback)
     (assert (fn? callback) (str "The callback parameter to clojure.browser.repl/bootstrap expected to be a function."
                                 "Got " (type callback) " instead."))
     (.push *boostrap-listeners* callback))
   (call-after-document-finished-loading boostrap-if-needed! 0)))
