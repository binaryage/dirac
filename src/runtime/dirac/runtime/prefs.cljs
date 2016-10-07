(ns dirac.runtime.prefs
  (:require-macros [dirac.runtime.prefs :refer [gen-static-prefs]]))

(def known-features [:repl])
(def default-features [:repl])
(def feature-groups {:all     known-features
                     :default default-features})
(def reset-styles "color:inherit;background-color:none;font-weight:normal;text-decoration:none;font-style:normal")

(def default-prefs
  {; you can specify a list/vector of features from known-features or a keyword from feature-groups
   :features-to-install                          :default
   :dont-display-banner                          false
   :safe-print-level                             1
   :safe-print-length                            10
   :agent-host                                   "localhost"
   :agent-port                                   "8231"
   :agent-verbose                                false
   :agent-auto-reconnect                         true
   :agent-response-timeout                       5000
   :weasel-verbose                               false
   :weasel-auto-reconnect                        false
   :weasel-pre-eval-delay                        100
   :install-check-total-time-limit               3000
   :install-check-next-trial-waiting-time        500
   :install-check-eval-time-limit                300
   :context-availability-total-time-limit        3000
   :context-availability-next-trial-waiting-time 10
   :eval-time-limit                              10000
   :java-trace-header-style                      "color:red"

   :rich-text-enabled                            true
   :rich-text-reset-style                        reset-styles
   :rich-text-code-style                         "color:#666; background-color:rgba(198, 198, 198, 0.3)"
   :rich-text-ansi-style-0                       reset-styles
   :rich-text-ansi-style-1                       "font-weight:bold"
   :rich-text-ansi-style-3                       "font-style: italic"
   :rich-text-ansi-style-4                       "text-decoration: underline"
   :rich-text-ansi-style-9                       "text-decoration: line-through"
   :rich-text-ansi-style-22                      "font-weight:normal;"
   :rich-text-ansi-style-23                      "font-style:normal"
   :rich-text-ansi-style-24                      "text-decoration:none;"
   :rich-text-ansi-style-29                      "text-decoration:none;"
   ; foreground colors
   :rich-text-ansi-style-30                      "color: rgb(0, 0, 0)"                                                        ; black
   :rich-text-ansi-style-31                      "color: rgb(128, 0, 0)"                                                      ; red
   :rich-text-ansi-style-32                      "color: rgb(0, 128, 0)"                                                      ; green
   :rich-text-ansi-style-33                      "color: rgb(128, 128, 0)"                                                    ; yellow
   :rich-text-ansi-style-34                      "color: rgb(0, 0, 128)"                                                      ; blue
   :rich-text-ansi-style-35                      "color: rgb(128, 0, 128)"                                                    ; magenta
   :rich-text-ansi-style-36                      "color: rgb(0, 128, 128)"                                                    ; cyan
   :rich-text-ansi-style-37                      "color: rgb(128, 128, 128)"                                                  ; gray
   ; background colors
   :rich-text-ansi-style-40                      "background-color: rgba(0, 0, 0, 0.2)"                                       ; black
   :rich-text-ansi-style-41                      "background-color: rgba(128, 0, 0, 0.2)"                                     ; red
   :rich-text-ansi-style-42                      "background-color: rgba(0, 128, 0, 0.2)"                                     ; green
   :rich-text-ansi-style-43                      "background-color: rgba(128, 128, 0, 0.2)"                                   ; yellow
   :rich-text-ansi-style-44                      "background-color: rgba(0, 0, 128, 0.2)"                                     ; blue
   :rich-text-ansi-style-45                      "background-color: rgba(128, 0, 128, 0.2)"                                   ; magenta
   :rich-text-ansi-style-46                      "background-color: rgba(0, 128, 128, 0.2)"                                   ; cyan
   :rich-text-ansi-style-47                      "background-color: rgba(128, 128, 128, 0.2)"                                 ; gray

   :runtime-tag                                  "unidentified"
   :nrepl-config                                 nil                                                                          ; see https://github.com/binaryage/dirac/blob/master/src/nrepl/dirac/nrepl/config.clj
   :silence-use-of-undeclared-var-warnings       true
   :silence-no-such-namespace-warnings           true})


(def static-prefs (gen-static-prefs))                                                                                         ; this config is comming from environment and system properties

(def current-prefs (atom (merge default-prefs static-prefs)))

; -- PUBLIC API -------------------------------------------------------------------------------------------------------------

(defn get-prefs []
  @current-prefs)

(defn pref [key]
  (key (get-prefs)))

(defn set-prefs! [new-prefs]
  (reset! current-prefs new-prefs))

(defn set-pref! [key val]
  (swap! current-prefs assoc key val))

(defn merge-prefs! [m]
  (swap! current-prefs merge m))

(defn update-pref! [key f & args]
  (apply swap! current-prefs update key f args))
