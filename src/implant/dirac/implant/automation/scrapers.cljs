(ns dirac.implant.automation.scrapers
  (:require-macros [dirac.implant.automation.scrapers :refer [safe->>]])
  (:require [cljs.pprint :refer [pprint]]
            [clojure.string :as string]
            [clojure.walk :refer [postwalk prewalk]]
            [dirac.implant.automation.reps :refer [build-rep select-subrep select-subreps]]
            [dirac.implant.logging :refer [error info log warn]]
            [dirac.shared.async :refer [<! alts! close! go go-channel go-wait put!]]
            [dirac.shared.dom :as dom]
            [dirac.shared.utils]                                                                                              ; required by macros
            [oops.core :refer [oapply ocall oget oset!]]))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn pp-rep [rep]
  (with-out-str (pprint rep)))

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

(defn find-call-frame-elements []
  (dom/query-selector "html /deep/ .call-frame-item"))

(defn extract-sub-elements [selector els]
  (mapcat #(dom/query-selector % selector) els))

(defn print-callstack-function [rep]
  (let [{:keys [title content]} rep]
    (str content (if title (str " / " title)))))

(defn print-callstack-location [rep]
  (let [{:keys [title content]} rep]
    (str content (if title (str " / " title)))))

; -- scope UI ----------------------------------------------------------------------------------------------------------

(defn find-scope-section-elements []
  (dom/query-selector "html /deep/ .scope-chain-sidebar-pane-section /deep/ .object-properties-section"))

(defn interesting-scope-class? [class-name]
  (or (= "name" class-name)
      (= "value" class-name)
      (= "object-properties-section-custom-section" class-name)))

(defn interesting-scope-tree-item-rep? [rep]
  (let [class-names (string/split (str (:class rep)) #" ")]
    (some interesting-scope-class? class-names)))

(defn extract-scope-info [[rep-name rep-value]]
  (let [name (str (:content rep-name))
        value (str (:deep-content rep-value))
        class (str (:class rep-value))
        display-value (if (re-find #"object-properties-section-custom-section" class)
                        "<custom>"
                        value)]
    (str name ": " display-value)))

(defn internal-scope-item? [item]
  (string/starts-with? item "[["))

(defn remove-internal-scope-items [items]
  (remove internal-scope-item? items))

; -- suggest box UI (code completions) --------------------------------------------------------------------------------------

(defn find-suggest-box-element []
  (first (dom/query-selector "html /deep/ .suggest-box")))

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
        pre-query (extract "pre-query")
        query (extract "query")
        post-query (extract "post-query")
        epilogue (extract "epilogue")]
    (str (if prologue (str " [" prologue "] "))
         (str (if pre-query (str pre-query "~")) query "|" post-query " ")
         (if epilogue (str "[" epilogue "] "))
         (if-not (empty? simple-class) (str "(" simple-class ") ")))))

; -- dirac prompt UI --------------------------------------------------------------------------------------------------------

(defn find-dirac-prompt-placeholder-element []
  (first (dom/query-selector "html /deep/ .dirac-prompt-placeholder")))

; -- console UI -------------------------------------------------------------------------------------------------------------

(defn log-kind-to-class-name [kind]
  (when (some? kind)
    (str ".console-" kind "-level")))

(defn find-all-console-log-elements []
  (dom/query-selector "html /deep/ .console-message-wrapper"))

(defn find-expand-group-icon [el]
  (first (dom/query-selector el ".expand-group-icon")))

(defn find-console-log-elements [kind]
  (dom/query-selector (str "html /deep/ .console-message-wrapper" (log-kind-to-class-name kind))))

(defn find-console-log-element [kind n]
  (nth (find-console-log-elements kind) n nil))

(defn find-last-console-log-element [kind]
  (last (find-console-log-elements kind)))

(defn count-console-log-elements [kind]
  (count (find-console-log-elements kind)))

(defn find-stack-preview-container-in-console-error-element [error-el]
  (when (some? error-el)
    (first (dom/query-selector error-el "html /deep/ .stack-preview-container"))))

(defn find-console-message-text-element [console-message-wrapper-element]
  (when (some? console-message-wrapper-element)
    (first (dom/query-selector console-message-wrapper-element "html /deep/ .console-message-text"))))

(defn extract-log-content [console-message-wrapper-el]
  (-> console-message-wrapper-el
      (find-console-message-text-element)
      (get-deep-text-content)))

(defn print-function-name-item [item-rep]
  (let [{:keys [content]} item-rep]
    content))

(defn filter-elements* [substr-or-re els]
  (doall
    (let [* (fn [el]
              [el (extract-log-content el)])
          texts (map * els)]
      (if (nil? substr-or-re)
        texts
        (filter #(if (string? substr-or-re)
                   (string/includes? (second %) substr-or-re)
                   (re-matches substr-or-re (second %))) texts)))))

(defn filter-elements [substr-or-re els]
  (map first (filter-elements* substr-or-re els)))

(defn get-filtered-contents [substr-or-re els]
  (map second (filter-elements* substr-or-re els)))

(defn go-expand-groups [els]
  (go
    (doall
      (let [expand! (fn [console-message-wrapper-el]
                      (assert (string/includes? (dom/get-class-name console-message-wrapper-el) "console-message-wrapper"))
                      (if-let [expand-group-el (find-expand-group-icon console-message-wrapper-el)]
                        (do
                          (ocall expand-group-el "click")
                          console-message-wrapper-el)
                        (error "no .expand-group-icon under" console-message-wrapper-el)))
            expanded-group-els (keep expand! els)]
        ; give it some time to re-render/invalidate
        (<! (go-wait 500))                                                                                                    ; TODO: remove me, FLAKY!
        expanded-group-els))))

(defn go-find-group-elements [group-elements-channel]
  (go
    (doall
      (let [* (fn [group-header-el]
                (loop [res []
                       cur-el group-header-el]
                  (let [next-el (dom/get-next-sibling cur-el)
                        next-res (conj res cur-el)
                        closed? (pos? (count (dom/query-selector cur-el ":scope > .group-closed")))]
                    (if closed?
                      next-res
                      (recur next-res next-el)))))]
        (map * (<! group-elements-channel))))))

(defn go-extract-logs [data-channel]
  (go
    (doall
      (let [* (fn [els] (map extract-log-content els))]
        (map * (<! data-channel))))))

(defn debug-print [v & [label]]
  (log (or label "scraper debug:") (pr-str v))
  v)

; -- general interface for :scrape automation action ------------------------------------------------------------------------

; note: scrapers might return a go channel, automation subsystem will wait for it to deliver a value

(defmulti scrape (fn [name & _args]
                   (keyword name)))

(defmethod scrape :default [name & _]
  (str "! scraper '" name "' has missing implementation in dirac.implant.automation.scrapers"))

(defmethod scrape :callstack-pane-functions [_ & _]
  (safe->> (find-call-frame-elements)
           (extract-sub-elements ".call-frame-title-text")
           (map build-rep)
           (map print-callstack-function)
           (print-list)))

(defmethod scrape :callstack-pane-locations [_ & _]
  (safe->> (find-call-frame-elements)
           (extract-sub-elements ".call-frame-location")
           (map build-rep)
           (map print-callstack-location)
           (print-list)))

(defmethod scrape :scope-content [_ & _]
  (safe->> (find-scope-section-elements)
           (first)
           (build-rep)
           (select-subreps interesting-scope-tree-item-rep?)
           (partition-all 2)
           (map extract-scope-info)
           (remove-internal-scope-items)
           (print-list)))

(defmethod scrape :suggest-box [_ & _]
  (if-let [suggest-box-el (find-suggest-box-element)]
    (safe->> suggest-box-el
             (build-rep)
             (select-subreps suggest-box-item-rep?)
             (map print-suggest-box-item)
             (print-list))
    (print-list (list))))

(defmethod scrape :dirac-prompt-placeholder [_ & _]
  (if-some [placeholder-el (find-dirac-prompt-placeholder-element)]
    (get-deep-text-content placeholder-el)
    "<no placeholder>"))

(defmethod scrape :function-names-in-last-console-exception [_ & _]
  (safe->> (find-last-console-log-element "error")
           (find-stack-preview-container-in-console-error-element)
           (build-rep)
           (select-subreps function-name?)
           (map print-function-name-item)
           (print-list)))

(defmethod scrape :log-item-content [_ & [kind n]]
  (safe->> (find-console-log-element kind n)
           (find-console-message-text-element)
           (get-deep-text-content)))

(defmethod scrape :last-log-item-content [_ & [kind]]
  (safe->> (find-last-console-log-element kind)
           (find-console-message-text-element)
           (get-deep-text-content)))

(defmethod scrape :count-log-items [_ & [kind]]
  (safe->> (count-console-log-elements kind)))

(defmethod scrape :find-logs [_ & [substr-or-re]]
  (safe->> (find-all-console-log-elements)
           (get-filtered-contents substr-or-re)))

(defmethod scrape :find-logs-in-groups [_ & [substr-or-re]]
  ; returns:
  ; 1. for each matched group log
  ; 1.2. list of contents belonging to that group, including group header as the first item
  ; => list of lists of strings
  (safe->> (find-all-console-log-elements)
           (filter-elements substr-or-re)
           (go-expand-groups)                                                                                                 ; ! async => channel
           (go-find-group-elements)
           (go-extract-logs)))
