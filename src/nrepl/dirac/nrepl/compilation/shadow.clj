(ns dirac.nrepl.compilation.shadow
  (:require [clojure.tools.logging :as log]
            [dirac.nrepl.shadow :as shadow]
            [dirac.lib.utils :as utils]
            [clojure.tools.reader :as reader]
            [clojure.tools.reader.reader-types :as readers]
            [cljs.tagged-literals :as tags]
            [cljs.analyzer :as ana]                                                                                           ; TODO: drop this dependency
            [cljs.tagged-literals :as tags]))

; here we wrap usage of shadow-cljs compilation

(def ^:dynamic *current-ns* 'cljs.user)

(defn generate-js! [repl-env compiler-env filename form compiler-opts]
  (log/debug "[shadow] generate-js!:\n" (utils/pp form 100) (utils/pp compiler-env 2))
  (let [build-id (:build-id compiler-env)
        _ (assert build-id)
        build-state (shadow/get-build-state build-id)
        _ (assert build-state)
        read-result {:form   form
                     :source "TODO"
                     :ns     *current-ns*}
        new-state (shadow/repl-process-read-result build-state read-result)
        last-repl-action (last (get-in new-state [:repl-state :repl-actions]))
        generated-js (:js last-repl-action)]
    (log/debug "generated-js:\n" generated-js)
    generated-js))

; this is modelled after cljs.repl monstrosity, but only kept bits we actually use
(defn repl*
  [repl-env {:keys [need-prompt prompt flush read eval print caught reader compiler-env repl-requires]
             :or   {need-prompt false
                    ;repl-requires    '[[cljs.repl :refer-macros [source doc find-doc apropos dir pst]]
                    ;                   [cljs.pprint :refer [pprint] :refer-macros [pp]]]
                    }
             :as   opts}]
  (try
    (let [;repl-opts (-repl-options repl-env)
          ;repl-requires (into repl-requires (:repl-requires repl-opts))
          request-prompt (Object.)
          request-exit (Object.)
          opts (merge opts (:merge-opts (cljs.repl/setup repl-env opts)))
          read-eval-print (fn []
                            (let [input (binding [;*ns* (create-ns ana/*cljs-ns*)
                                                  reader/resolve-symbol ana/resolve-symbol
                                                  reader/*data-readers* tags/*cljs-data-readers*
                                                  ;reader/*alias-map*
                                                  #_(apply merge
                                                           ((juxt :requires :require-macros)
                                                            (ana/get-namespace ana/*cljs-ns*)))]
                                          (try
                                            (read request-prompt request-exit)
                                            (catch Throwable e
                                              (throw (ex-info nil {:clojure.error/phase :read-source} e)))))]
                              (or ({request-exit   request-exit
                                    :cljs/quit     request-exit
                                    request-prompt request-prompt} input)
                                  (let [value (eval repl-env compiler-env input opts)]
                                    (try
                                      (print value)
                                      (catch Throwable e
                                        (throw (ex-info nil {:clojure.error/phase :print-eval-result} e))))))))]
      (binding [*in* (reader)]
        (loop []
          (when-not
            (try
              (identical? (read-eval-print) request-exit)
              (catch Throwable e
                (caught e repl-env opts)
                nil))
            (when (need-prompt)
              (prompt)
              (flush))
            (recur)))))
    (finally
      (cljs.repl/tear-down repl-env))))

; -- compilation API --------------------------------------------------------------------------------------------------------

(defmacro setup-current-ns [ns & forms]
  `(binding [*current-ns* ~ns]
     ~@forms))

(defmacro get-current-ns []
  `(do *current-ns*))                                                                                                         ; TODO: query shadow state

(defmacro generate-js [repl-env compiler-env filename form compiler-opts]
  `(generate-js! ~repl-env ~compiler-env ~filename ~form ~compiler-opts))

(defn cljs-repl-shim [repl-env opts]
  (repl* repl-env opts))
