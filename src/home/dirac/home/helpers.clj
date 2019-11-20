(ns dirac.home.helpers
  (:require [clojure.java.io :as io]
            [org.httpkit.client :as http]
            [clojure.edn :as edn]
            [clojure.string :as string])
  [:import (java.util.zip ZipInputStream)
           (java.io PushbackReader IOException)
           (javax.net.ssl SSLEngine SSLParameters SNIHostName)
           (java.net URI)
           (org.httpkit.client IFilter)
           (org.httpkit DynamicBytes)
           (java.util Map)])

(def ^:dynamic *system-get-property-impl*)
(def ^:dynamic *system-get-env-impl*)

(defn system-get-property [name]
  (if (bound? #'*system-get-property-impl*)
    (*system-get-property-impl* name)
    (System/getProperty name)))

(defn system-get-env [name]
  (if (bound? #'*system-get-env-impl*)
    (*system-get-env-impl* name)
    (System/getenv name)))

(defn ensure-dir! [file]
  (let [file (io/file file)]
    (if (.exists file)
      (if-not (.isDirectory file)
        (throw (ex-info (str "Unexpected file at '" file "'") {:file file})))
      (if-not (.mkdirs file)
        (throw (ex-info (str "Unable to create directory: '" file "'") {:file file}))))))

(defn- sni-configure [^SSLEngine ssl-engine ^URI uri]
  (.setUseClientMode ssl-engine true)
  (let [^SSLParameters ssl-params (.getSSLParameters ssl-engine)]
    (.setServerNames ssl-params [(SNIHostName. (.getHost uri))])
    (.setSSLParameters ssl-engine ssl-params)))

(defn- make-ssl-aware-http-client []
  (http/make-client {:ssl-configurer sni-configure}))

(defn- make-progress-filter [progress-callback]
  (if (fn? progress-callback)
    (let [total (atom nil)]
      (reify IFilter
        (^boolean accept [_this ^DynamicBytes body]
          ; called when new data received, body is growing
          (progress-callback (.length body) @total)
          (boolean true))
        (^boolean accept [_this ^Map headers]
          ; called when HTTP headers received
          (if-some [content-length (get headers "content-length")]
            (reset! total (Long/parseLong content-length)))
          (boolean headers))))))

; unfortunately http-kit buffers whole stream before passing it to us
; see https://github.com/http-kit/http-kit/issues/90
; we will be downloading dirac release zip files (those are ~5MB currently, ~Dec 2019)
; so this is not a pressing issue right now
; TODO: consider using streaming clj-http instead
(defn get-url-stream
  ([url] (get-url-stream url {}))
  ([url opts]
   (let [client (make-ssl-aware-http-client)
         progress-callback (get opts :progress-callback)
         filter (make-progress-filter progress-callback)
         request {:url    url
                  :method :get
                  :as     :stream
                  :client client
                  :filter filter}
         {:keys [status body error]} @(http/request request)]
     (if (fn? progress-callback)
       (progress-callback :done))
     (if (some? error)
       (throw (ex-info (str "Failed downloading url: '" url "', due to " error)
                       {:error error
                        :url   url})))
     (if (not= status 200)
       (throw (ex-info (str "Failed downloading url: '" url "', server responded with status " status)
                       {:status status
                        :url    url})))
     body)))

(defn unzip! [zip-stream dir]
  (if-some [entry (.getNextEntry zip-stream)]
    (let [file (io/file dir (.getName entry))]
      (if (.isDirectory entry)
        (ensure-dir! file)
        (let [parent-file (.getParentFile file)]
          (ensure-dir! parent-file)
          (io/copy zip-stream file)))
      (recur zip-stream dir))))

(defn download-and-unzip!
  ([zip-url dir] (download-and-unzip! zip-url dir {}))
  ([zip-url dir opts]
   (with-open [stream (ZipInputStream. (get-url-stream zip-url opts))]
     (unzip! stream dir))))

(defn download! [uri file]
  (with-open [in (io/input-stream uri)
              out (io/output-stream file)]
    (io/copy in out)
    file))

(defn read-edn [source]
  (try
    (with-open [reader (io/reader source)]
      (edn/read (PushbackReader. reader)))
    (catch IOException e
      (throw (ex-info (format "Couldn't open '%s': %s\n" source (.getMessage e)) {:source source})))
    (catch RuntimeException e
      (throw (ex-info (format "Error parsing edn file '%s': %s\n" source (.getMessage e)) {:source source})))))

(defn map-vals [f m]
  (reduce-kv (fn [m k v] (assoc m k (f v))) {} m))

(defn map-keys [f m]
  (reduce-kv (fn [m k v] (assoc m (f k) v)) {} m))

(defn erase-blank-vals [m]
  (map-vals (fn [v] (if-not (string/blank? v) v)) m))

(defn silent-parse-int
  "Parse integer from string on best effort basis. Blank string returns nil."
  [s]
  (if (string/blank? s)
    nil
    (try
      (Integer/parseInt (string/replace s #"[^0-9]" ""))
      (catch Exception _e
        0))))

(defn pad-coll [coll n val]
  (take n (concat coll (repeat val))))

(defn read-and-trim-first-line [file]
  (with-open [reader (io/reader file)]
    (string/trim (first (line-seq reader)))))

(defn read-trimmed-lines [file]
  (with-open [reader (io/reader file)]
    (doall (map string/trim (line-seq reader)))))

(defn comment-line? [line]
  (string/starts-with? line "#"))

(defn filter-commented-lines [lines]
  (filter (complement comment-line?) lines))

(defn absolutize-path [root-dir path]
  (if (some? path)
    (let [file (io/file path)]
      (if (.isAbsolute file)
        (.getCanonicalPath file)
        (.getCanonicalPath (io/file root-dir file))))))

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  (filter-commented-lines ["# test comment"
                           "--enable-logging=stderr"
                           "# test comment"
                           "--v=1"
                           "# test comment"])
  )
