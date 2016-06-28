(ns dirac.implant.automation.reps
  (:require-macros [com.rpl.specter.macros :refer [providepath declarepath select select-first]])
  (:require [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log warn error info]]
            [com.rpl.specter :refer [must continue-then-stay multi-path if-path ALL]]
            [dirac.dom :as dom]))

; "reps" are simple data structures representing interesting bits of a DOM tree snapshot.
; As you can see in `build-rep` we record tag, class, title, content, child DOM nodes and shadow DOM relationships.
; Please note that reps are just nested maps, they can be conveniently processed by Specter (via RepWalker) or any other way.
; See common helpers for working with reps below.

; An example of rep can be this widget of "Call Stack" sidebar pane component:
(comment
  {:tag         "div",
   :class       "widget vbox",
   :shadow-root {:tag      "div"
                 ;...
                 :children ()}
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

; -- specter walker ---------------------------------------------------------------------------------------------------------

(declarepath RepWalker)

(providepath RepWalker
  (continue-then-stay
    (multi-path
      [(must :children) ALL]
      (must :shadow-root))
    RepWalker))

; -- helpers ----------------------------------------------------------------------------------------------------------------

(defn clean-rep [rep]
  (into {} (remove (comp empty? second) rep)))

(defn select-subrep [pred rep]
  (select-first [RepWalker pred] rep))

(defn select-subreps [pred rep]
  (select [RepWalker pred] rep))

; -- building reps ----------------------------------------------------------------------------------------------------------

(defn build-rep [el]
  (if (some? el)
    (clean-rep {:tag         (dom/get-tag-name el)
                :class       (dom/get-class-name el)
                :content     (dom/get-own-text-content el)
                :title       (dom/get-title el)
                :children    (doall (map build-rep (dom/get-children el)))
                :shadow-root (build-rep (dom/get-shadow-root el))})))
