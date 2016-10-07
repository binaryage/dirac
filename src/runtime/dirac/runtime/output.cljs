(ns dirac.runtime.output
  (:require [goog.array :as garray]
            [clojure.string :as string]
            [dirac.runtime.prefs :refer [get-prefs pref]]))

(def re-split (js/RegExp. "(---<.*?>---)" "g"))
(def re-style (js/RegExp. "---<(.*?)>---"))

; -- marking pass for code snippets -----------------------------------------------------------------------------------------

(def re-code (js/RegExp. "`(.*?)`" "g"))

(defn mark-code [text]
  (let [code-style (pref :rich-text-code-style)
        reset-style (pref :rich-text-reset-style)]
    (.replace text re-code (str "---<" code-style ">---$1---<" reset-style ">---"))))

; -- marking pass for ANSI --------------------------------------------------------------------------------------------------

; we support only a subset of SGR, see https://en.wikipedia.org/wiki/ANSI_escape_code
(def CSI "\u001B\\[")
(def re-ansi (js/RegExp. (str CSI "([0-9;]+)" "m") "g"))

(defn parse-int [v]
  (let [res (js/parseInt v 10)]
    (if-not (js/isNaN res)
      res)))

(defn command-to-style [command]
  (let [pref-key (keyword (str "rich-text-ansi-style-" command))]
    (pref pref-key)))

(defn ansi-code-to-style [sgr-code]
  (let [commands (keep parse-int (.split sgr-code ";"))
        sanitized-commands (if (empty? commands) [0] commands)
        styles (map command-to-style sanitized-commands)]
    (string/join ";" styles)))

(defn mark-ansi [text]
  (.replace text re-ansi (fn [match sgr-code]
                           (str "---<" (ansi-code-to-style sgr-code) ">---"))))

; -- soup preparation -------------------------------------------------------------------------------------------------------

(defn style? [s]
  (.test re-style s))

(defn build-format-string [soup]
  (string/join (map #(if (style? %) "%c" "%s") soup)))

(defn boil-soup [soup]
  (let [* (fn [x]
            (if (style? x)
              (second (.match x re-style))
              x))]
    (map * soup)))

; -- public api -------------------------------------------------------------------------------------------------------------

(defn boil-rich-text [text]
  (let [marked-text (-> text
                        mark-code
                        mark-ansi)
        soup (.split marked-text re-split)
        format-string (build-format-string soup)
        boiled-soup (boil-soup soup)]
    (cons format-string boiled-soup)))
