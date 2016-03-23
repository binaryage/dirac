(ns dirac.fixtures.helpers
  (:require-macros [cljs.core.async.macros :refer [go go-loop]])
  (:require [cljs.core.async :refer [put! <! chan timeout alts! close!]]
            [chromex.support :refer-macros [oget oset ocall oapply]])
  (:import goog.Uri))

(defn get-body-el []
  (-> js/document (.getElementsByTagName "body") (.item 0)))

(defn get-el-by-id [id]
  (-> js/document (.getElementById id)))

(defn make-uri-object [url]
  (Uri. url))

(defn get-query-param [url param]
  (let [uri (make-uri-object url)]
    (.getParameterValue uri param)))

(defn get-document-url []
  (str (.-location js/document)))

(defn is-test-runner-present? []
  (let [url (get-document-url)]
    (boolean (get-query-param url "test_runner"))))
