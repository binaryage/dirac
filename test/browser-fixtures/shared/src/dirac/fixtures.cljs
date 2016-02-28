(ns dirac.fixtures
  (:require [dirac.fixtures.transcript :as transcript]
            [dirac.fixtures.embedcom :as embedcom]
            [devtools.core :as devtools]))

(def current-transcript (atom nil))

(defn init-devtools! []
  (devtools/enable-feature! :dirac :sanity-hints)
  (devtools/install!))

(defn get-body-el []
  (-> js/document (.getElementsByTagName "body") (.item 0)))

(defn get-el-by-id [id]
  (-> js/document (.getElementById id)))

(defn init-transcript! [id]
  (let [transcript-el (transcript/create-transcript! (get-el-by-id id))]
    (reset! current-transcript transcript-el)))

(defn has-transcript? []
  (not (nil? @current-transcript)))

(defn append-to-transcript! [text]
  {:pre [(has-transcript?)]}
  (transcript/append-to-transcript! @current-transcript text))

(defn read-transcript []
  {:pre [(has-transcript?)]}
  (transcript/read-transcript @current-transcript))

(defn do! [data]
  (append-to-transcript! (str "exec" (pr-str data)))
  (embedcom/post-page-event! data))