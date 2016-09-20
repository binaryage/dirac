(ns dirac.implant.automation.scrapers
  (:require-macros [com.rpl.specter.macros :refer [providepath declarepath transform select select-one select-first]]
                   [dirac.implant.automation.scrapers :refer [safe->>]])
  (:require [oops.core :refer [oget oset! ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [cljs.pprint :refer [pprint]]
            [com.rpl.specter :refer [must continue-then-stay multi-path if-path ALL STAY]]
            [dirac.implant.automation.reps :refer [select-subrep select-subreps build-rep]]
            [dirac.dom :as dom]
            [dirac.utils]
            [clojure.string :as string]))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn pp-rep [rep]
  (with-out-str (pprint rep)))

(defn widget-rep? [rep]
  (some? (re-find #"widget" (str (:class rep)))))

(defn title-rep? [rep]
  (= "title" (:class rep)))

(defn subtitle-rep? [rep]
  (= "subtitle" (:class rep)))

(defn suggest-box-item-rep? [rep]
  (some? (re-find #"suggest-box-content-item" (str (:class rep)))))

(defn function-name? [rep]
  (some? (re-find #"function-name" (str (:class rep)))))

(defn print-list [list]
  (if (empty? list)
    "no items displayed"
    (str "displayed " (count list) " items:\n"
         (string/join "\n" (map #(str " * " (or % "<empty>")) list)))))

(defn get-deep-text-content [el]
  (ocall el "deepTextContent"))

; -- call stack UI ----------------------------------------------------------------------------------------------------------

(defn is-callstack-title-el? [el]
  (= (oget el "textContent") "Call Stack"))

(defn find-callstack-pane-element []
  (let [title-els (dom/query-selector "html /deep/ .expandable-view-title")]
    (if-let [callstack-title-el (select-first [ALL is-callstack-title-el?] title-els)]
      (if-let [callstack-body-el (oget callstack-title-el "?parentNode.?parentNode.?host.?firstChild")]
        (first (dom/query-selector callstack-body-el "html /deep/ .widget"))))))

(defn get-callstack-pane-rep [callstack-pane-el]
  (build-rep callstack-pane-el))

(defn select-callstack-widget-rep [rep]
  ; example output
  (comment
    {:tag   "div",
     :class "widget vbox",
     :children
            ({:tag      "div",
              :class    "list-item selected",
              :children ({:tag     "div",
                          :class   "subtitle",
                          :content "core.cljs:10",
                          :title   "http://localhost:9080/compiled/tests/dirac/tests/scenarios/breakpoint/core.cljs:10"}
                          {:tag     "div",
                           :class   "title",
                           :content "breakpoint-demo",
                           :title   "dirac.tests.scenarios.breakpoint.core/breakpoint-demo"})}
              ; ...
              {:tag      "div",
               :class    "list-item",
               :children ({:tag     "div",
                           :class   "subtitle",
                           :content "notifications.cljs:53",
                           :title   "http://localhost:9080/compiled/tests/dirac/automation/notifications.cljs:53"}
                           {:tag     "div",
                            :class   "title",
                            :content "process-event!",
                            :title   "dirac.automation.notifications/process-event!"})})})

  (select-subrep widget-rep? rep))

(defn print-callstack-function [rep]
  (let [{:keys [title content]} rep]
    (str content (if title (str " / " title)))))

(defn print-callstack-location [rep]
  (let [{:keys [title content]} rep]
    (str content (if title (str " / " title)))))

; -- suggest box UI (code completions) --------------------------------------------------------------------------------------

(defn find-suggest-box-element []
  (first (dom/query-selector "html /deep/ .suggest-box-overlay")))

(defn print-suggest-box-item [item-rep]
  (let [{:keys [class]} item-rep
        extract (fn [class] (:content (select-subrep (fn [rep] (= class (:class rep))) item-rep)))
        simple-class (-> class
                         (string/replace "suggest-box-content-item" "")
                         (string/replace "source-code" "")
                         (string/replace "suggest-cljs-" "")
                         (string/replace "suggest-cljs" "")
                         (string/trim))
        prologue (extract "prologue")
        prefix (extract "prefix")
        suffix (extract "suffix")
        epilogue (extract "epilogue")]
    (str (if prologue (str " [" prologue "] "))
         (str prefix "|" suffix " ")
         (if epilogue (str "[" epilogue "] "))
         (if-not (empty? simple-class) (str "(" simple-class ") ")))))

; -- console UI -------------------------------------------------------------------------------------------------------------

(defn find-last-console-log-element [kind]
  (last (dom/query-selector (str "html /deep/ .console-" (or kind "log") "-level"))))

(defn count-console-log-elements [kind]
  (count (dom/query-selector (str "html /deep/ .console-" (or kind "log") "-level"))))

(defn find-stack-preview-container-in-console-error-element [error-el]
  (if (some? error-el)
    (first (dom/query-selector error-el "html /deep/ .stack-preview-container"))))

(defn find-console-message-text-element [console-message-wrapper-element]
  (if (some? console-message-wrapper-element)
    (first (dom/query-selector console-message-wrapper-element "html /deep/ .console-message-text"))))

(defn print-function-name-item [item-rep]
  (let [{:keys [content]} item-rep]
    content))

; -- general interface for :scrape automation action ------------------------------------------------------------------------

(defmulti scrape (fn [name & _args]
                   (keyword name)))

(defmethod scrape :default [name & _]
  (str "! scraper '" name "' has missing implementation in dirac.implant.automation.scrapers"))

(defmethod scrape :callstack-pane-functions [_ & _]
  (safe->> (find-callstack-pane-element)
           (get-callstack-pane-rep)
           (select-callstack-widget-rep)
           (select-subreps title-rep?)
           (map print-callstack-function)
           (print-list)))

(defmethod scrape :callstack-pane-locations [_ & _]
  (safe->> (find-callstack-pane-element)
           (get-callstack-pane-rep)
           (select-callstack-widget-rep)
           (select-subreps subtitle-rep?)
           (map print-callstack-location)
           (print-list)))

(defmethod scrape :suggest-box [_ & _]
  (safe->> (find-suggest-box-element)
           (build-rep)
           (select-subreps suggest-box-item-rep?)
           (map print-suggest-box-item)
           (print-list)))

(defmethod scrape :function-names-in-last-console-exception [_ & _]
  (safe->> (find-last-console-log-element "error")
           (find-stack-preview-container-in-console-error-element)
           (build-rep)
           (select-subreps function-name?)
           (map print-function-name-item)
           (print-list)))

(defmethod scrape :last-log-item-content [_ & [kind]]
  (safe->> (find-last-console-log-element kind)
           (find-console-message-text-element)
           (get-deep-text-content)))

(defmethod scrape :count-log-items [_ & [kind]]
  (safe->> (count-console-log-elements kind)))
