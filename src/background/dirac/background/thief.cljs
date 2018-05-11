(ns dirac.background.thief
  (:require [chromex.ext.page-capture :as page-capture]
            [clojure.string :as string]
            [dirac.background.logging :refer [error info log warn]]
            [dirac.background.tools :as tools]
            [dirac.shared.async :refer [<! go go-channel go-wait]]
            [dirac.shared.mime :as mime]
            [dirac.shared.quoted-printable :as quoted-printable]
            [dirac.shared.sugar :as sugar]
            [dirac.shared.utils :as utils]
            [goog.string :as gstring]
            [oops.core :refer [oapply ocall oget oset!]]))

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
      "quoted-printable" (quoted-printable/decode-quoted-printable encoded-body))))

; -- backend api ------------------------------------------------------------------------------------------------------------

(defn extract-backend-api [raw-js]
  (let [re (js/RegExp. ";Protocol\\.inspectorBackend\\.register(.*?)\\)" "gm")
        res #js []]
    (loop []
      (when-let [m (.exec re raw-js)]
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

(defn extract-backend-css [raw-js]
  (let [re (js/RegExp. ";SDK\\.CSSMetadata\\._generatedProperties=(\\[.*\\])" "g")]
    (if-let [m (re-find re raw-js)]
      (second m))))

(defn insert-css-newlines [source]
  (string/replace source "}," "},\n"))

(defn steal-backend-css [inspector-js]
  (-> inspector-js
      (extract-backend-css)
      (insert-css-newlines)))

; -- robbery entry point ----------------------------------------------------------------------------------------------------

(defn go-scrape-bundled-devtools! []
  (go
    (info "Retrieving backend API and CSS defs...")
    (let [[window] (<! (tools/go-create-bundled-devtools-shell-window!))
          first-tab (first (oget window "tabs"))
          [mhtml] (<! (page-capture/save-as-mhtml (js-obj "tabId" (sugar/get-tab-id first-tab))))
          multipart-mime (<! (utils/go-convert-blob-to-string mhtml))]
      (<! (tools/go-remove-window! (sugar/get-window-id window)))
      (try
        (let [raw-js (steal-inspector-js multipart-mime)
              backend-api (steal-backend-api raw-js)
              backend-css (steal-backend-css raw-js)]
          [backend-api backend-css])
        (catch :default e
          (error "Unable to retrieve or parse inspector.js from bundled DevTools." e)
          [])))))
