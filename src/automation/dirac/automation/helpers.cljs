(ns dirac.automation.helpers
  (:require [oops.core :refer [gcall gcall! gget gget oapply ocall oget oset!]])
  (:import goog.Uri))

(defn get-body-el []
  (-> (gget "document")
      (ocall "getElementsByTagName" "body")
      (ocall "item" 0)))

(defn get-el-by-id [id]
  (gcall "document.getElementById" id))

(defn make-uri-object [url]
  (Uri. url))

(defn get-query-param [url param]
  (let [uri (make-uri-object url)]
    (ocall uri "getParameterValue" param)))

(defn get-matching-query-params [url re]
  (let [uri (make-uri-object url)
        query (ocall uri "getQueryData")
        matching-params (filter #(re-find re %) (ocall query "getKeys"))]
    (into {} (map (fn [key] [key (.get query key)]) matching-params))))

(defn get-encoded-query [url]
  (let [uri (make-uri-object url)]
    (ocall uri "getEncodedQuery")))

(defn get-document-url []
  (str (.-location js/document)))

(defn get-document-url-param [param]
  (let [url (get-document-url)]
    (get-query-param url param)))

(defn automated-testing? []
  (let [url (get-document-url)]
    (boolean (get-query-param url "test_runner"))))

(defn get-base-url []
  (str (gget "location.protocol") "//" (gget "location.host")))

(defn get-scenario-url [name & [additional-params]]
  (let [base-params (get-encoded-query (get-document-url))
        all-params (if additional-params (str base-params "&" additional-params) base-params)]
    (str (get-base-url) "/scenarios/" name ".html?" all-params)))                                                             ; we pass all query parameters to scenario page

(defn scroll-page-to-bottom! []
  (gcall! "scrollTo" 0 (gget "document.body.scrollHeight")))
