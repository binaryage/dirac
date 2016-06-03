(ns dirac.implant.automation.scrapers
  (:require-macros [com.rpl.specter.macros :refer [providepath declarepath transform select select-one select-first]])
  (:require [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [cljs.pprint :refer [pprint]]
            [com.rpl.specter :refer [must continue-then-stay multi-path if-path ALL STAY]]
            [dirac.implant.automation.scraping :as scraping :refer [RepWalker select-subrep select-subreps scrape-rep]]
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

(defn print-list [list]
  (if (empty? list)
    "no items displayed"
    (str "displayed " (count list) " items:\n"
         (string/join "\n" (map #(str " * " (or % "<empty>")) list)))))

; -- call stack UI ----------------------------------------------------------------------------------------------------------

(defn is-callstack-title-el? [el]
  (= (oget el "textContent") "Call Stack"))

(defn find-callstack-pane-element []
  (let [title-els (scraping/query-selector "html /deep/ .sidebar-pane-title")]
    (if-let [callstack-title-el (select-first [ALL is-callstack-title-el?] title-els)]
      (oget callstack-title-el "nextElementSibling"))))

(defn get-callstack-pane-rep [callstack-pane-el]
  (scrape-rep callstack-pane-el))

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

; -- general interface for :scrape automation action ------------------------------------------------------------------------

(defmulti scrape (fn [name & _args]
                   (keyword name)))

(defmethod scrape :default [name & _]
  (str "! scraper '" name "' has missing implementation in dirac.implant.automation.scrapers"))

(defmethod scrape :callstack-pane-functions [_ & _]
  (->> (find-callstack-pane-element)
       (get-callstack-pane-rep)
       (select-callstack-widget-rep)
       (select-subreps title-rep?)
       (map print-callstack-function)
       (print-list)))

(defmethod scrape :callstack-pane-locations [_ & _]
  (->> (find-callstack-pane-element)
       (get-callstack-pane-rep)
       (select-callstack-widget-rep)
       (select-subreps subtitle-rep?)
       (map print-callstack-location)
       (print-list)))