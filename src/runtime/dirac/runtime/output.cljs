(ns dirac.runtime.output
  (:require [clojure.string :as string]
            [dirac.runtime.prefs :refer [get-prefs pref]]
            [goog.string :as gstring]))

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
    (when-not (js/isNaN res)
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

(defn prepare-formatted-text [text]
  (let [marked-text (-> text
                        (gstring/htmlEscape true)
                        mark-code
                        mark-ansi)
        soup (.split marked-text re-split)
        format-string (build-format-string soup)
        boiled-soup (boil-soup soup)]
    (cons format-string boiled-soup)))

; -- html preparation -------------------------------------------------------------------------------------------------------

(def re-format-char (js/RegExp. (str "%(.)") "g"))

(defn build-html-from-formatted-string [format & args]
  (let [index-atom (atom 0)
        replacer (fn [match]
                   (let [format-char (second match)
                         value (nth args @index-atom)
                         html-snippet (case format-char
                                        "s" (str value)
                                        "c" (str "</span><span style=\"" value "\">"))]
                     (swap! index-atom inc)
                     html-snippet))
        unbalanced-html (.replace format re-format-char replacer)]
    (str "<span>" unbalanced-html "</span>")))

; -- public api -------------------------------------------------------------------------------------------------------------

(defn build-html [text]
  (let [format+args (prepare-formatted-text text)]
    (apply build-html-from-formatted-string format+args)))
