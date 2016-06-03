(ns dirac.implant.automation.scraping
  (:require-macros [com.rpl.specter.macros :refer [providepath declarepath select select-first]])
  (:require [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [com.rpl.specter :refer [must continue-then-stay multi-path if-path ALL]]
            [dirac.dom.shim]
            [clojure.string :as string]))

; -- specter walker ---------------------------------------------------------------------------------------------------------

(declarepath RepWalker)

(providepath RepWalker
  (continue-then-stay
    (multi-path
      [(must :children) ALL]
      (must :shadowRoot))
    RepWalker))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn clean-rep [rep]
  (into {} (remove (comp empty? second) rep)))

(defn select-subrep [pred rep]
  (select-first [RepWalker pred] rep))

(defn select-subreps [pred rep]
  (select [RepWalker pred] rep))

; -- DOM reading ------------------------------------------------------------------------------------------------------------

(defn query-selector [selector]
  (.querySelectorAll js/document selector))

(defn get-tag-name [el]
  (if-let [tag-name (oget el "tagName")]
    (string/lower-case tag-name)))

(defn get-class-name [el]
  (oget el "className"))

(defn get-children [el]
  (oget el "children"))

(defn get-shadow-root [el]
  (oget el "shadowRoot"))

(defn get-own-text-content [el]
  (if (empty? (get-children el))
    (oget el "textContent")))

(defn get-title [el]
  (oget el "title"))

; -- DOM scraping -----------------------------------------------------------------------------------------------------------

(defn scrape-rep [el]
  (if (some? el)
    (clean-rep {:tag        (get-tag-name el)
                :class      (get-class-name el)
                :content    (get-own-text-content el)
                :title      (get-title el)
                :children   (doall (map scrape-rep (get-children el)))
                :shadowRoot (scrape-rep (get-shadow-root el))})))