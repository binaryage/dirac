(ns dirac.mime
  (:require [chromex.support :refer-macros [oget oset ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [clojure.string :as string]))

; poor man's multipart MIME parser

; -- generic parsing of mime docs -------------------------------------------------------------------------------------------

(defn update-last [v f]
  {:pre [(pos? (count v))]}
  (vec (concat (butlast v) [(f (last v))])))

(defn parse-header-line [state line]
  (if-let [continuation-match (re-matches #"^\s+(.*)$" line)]
    (update-in state [:headers] update-last #(str % (second continuation-match)))
    (update-in state [:headers] conj line)))

(defn parse-header-item [item]
  (if-let [m (re-matches #"^(.*?):(.*)$" item)]
    [(nth m 1) (string/trim (nth m 2))]
    (throw (ex-info (str "unable to parse header item: '" item "'") {}))))

(defn parse-header-items [state]
  (into {} (map parse-header-item state)))

(defn process-headers [state]
  (-> state
      (parse-header-items)))

(defn retrieve-boundary [state]
  (if-let [content-type (get-in state [:headers "Content-Type"])]
    (if-let [boundary-match (re-find #"boundary=\"(.*?)\"" content-type)]
      (second boundary-match))))

(defn parse-header-lines [lines]
  (:headers (reduce parse-header-line {:headers []} lines)))

(defn parse-headers [source]
  (-> source
      (string/split-lines)
      (parse-header-lines)
      (process-headers)))

(defn split-headers-and-body [source]
  (let [splits (.split source "\n\n")
        headers (first splits)
        body-parts (.slice splits 1)
        body (.join body-parts "\n\n")]
    [headers body]))

(defn strip-leading-new-line [s]
  (if (= (first s) "\n")
    (.substring s 1)
    s))

(defn break-body-by-boundary [source boundary]
  (let [splits (.split source boundary)
        * (fn [part]
            (let [sanitized-part (strip-leading-new-line part)]
              (if-not (re-matches #"(-|\n)+" sanitized-part)
                sanitized-part)))]
    (keep * splits)))

(defn parse-mime [source]
  (let [[headers-str body-str] (split-headers-and-body source)]
    {:headers (parse-headers headers-str)
     :body    body-str}))

(defn parse-multipart-mime [source]
  (let [mime (parse-mime source)]
    {:headers (:headers mime)
     :parts   (if-let [boundary (retrieve-boundary mime)]
                (break-body-by-boundary (:body mime) boundary)
                (list (:body mime)))}))
