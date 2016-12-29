(ns dirac.background.thief
  (:require-macros [cljs.core.async.macros :refer [go go-loop]]
                   [dirac.background.logging :refer [log info warn error]])
  (:require [cljs.core.async :refer [<! chan timeout]]
            [oops.core :refer [oget oset! ocall oapply]]
            [chromex.ext.page-capture :as page-capture]
            [dirac.mime :as mime]
            [dirac.quoted-printable :as qp]
            [goog.string :as gstring]
            [dirac.utils :as utils]
            [dirac.background.tools :as tools]
            [clojure.string :as string]
            [dirac.sugar :as sugar]))

; -- inspector-js -----------------------------------------------------------------------------------------------------------

(defn extract-inspector-js [source]
  (let [multipart (mime/parse-multipart-mime source)
        _ (assert (= (count (:parts multipart)) 1))
        parsed-first-part (mime/parse-mime (first (:parts multipart)))
        content-type (get (:headers parsed-first-part) "Content-Type")
        _ (assert (= content-type "text/html"))
        content-transfer-encoding (get (:headers parsed-first-part) "Content-Transfer-Encoding")
        _ (assert (= content-transfer-encoding "quoted-printable"))
        encoded-body (:body parsed-first-part)]
    (case content-transfer-encoding
      "quoted-printable" (qp/decode-quoted-printable encoded-body))))

; -- backend api ------------------------------------------------------------------------------------------------------------

(defn extract-backend-api [inspector-js-source]
  (let [re (js/RegExp. ";Protocol\\.inspectorBackend\\.register(.*?)\\)" "gm")
        res #js []]
    (loop []
      (when-let [m (.exec re inspector-js-source)]
        (.push res (.substring (first m) 1))
        (recur)))
    (.join res "\n")))

(defn steal-inspector-js [multipart-mime]
  (-> multipart-mime
      (gstring/canonicalizeNewlines)
      (extract-inspector-js)))

(defn steal-backend-api [inspector-js]
  (-> inspector-js
      (extract-backend-api)))

; -- backend css ------------------------------------------------------------------------------------------------------------

(defn extract-backend-css [inspector-js-source]
  (let [re (js/RegExp. ";SDK\\.CSSMetadata\\._generatedProperties=(\\[.*\\])" "g")]
    (if-let [m (re-find re inspector-js-source)]
      (second m))))

(defn insert-css-newlines [source]
  (string/replace source "}," "},\n"))

(defn steal-backend-css [inspector-js]
  (-> inspector-js
      (extract-backend-css)
      (insert-css-newlines)))

; -- robbery entry point ----------------------------------------------------------------------------------------------------

(defn scrape-bundled-devtools! []
  (go
    (let [[window] (<! (tools/create-bundled-devtools-inspector-window!))
          first-tab (first (oget window "tabs"))
          [mhtml] (<! (page-capture/save-as-mhtml (js-obj "tabId" (sugar/get-tab-id first-tab))))
          multipart-mime (<! (utils/convert-blob-to-string mhtml))]
      (<! (tools/remove-window! (sugar/get-window-id window)))
      (try
        (let [inspector-js (steal-inspector-js multipart-mime)
              backend-api (steal-backend-api inspector-js)
              backend-css (steal-backend-css inspector-js)]
          [backend-api backend-css])
        (catch :default e
          (error "Unable to retrieve or parse inspector.js from bundled DevTools." e)
          [])))))

