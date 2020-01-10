(ns dirac.home.helpers
  (:require [clojure.java.io :as io]
            [org.httpkit.client :as http]
            [clojure.edn :as edn]
            [clojure.string :as string])
  [:import (java.util.zip ZipInputStream)
           (java.io PushbackReader IOException File)
           (javax.net.ssl SSLEngine SSLParameters SNIHostName)
           (java.net URI URL)
           (org.httpkit.client IFilter)
           (org.httpkit DynamicBytes)
           (java.util Map)
           (java.util.jar JarEntry JarFile)])

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

(defn ensure-dir! [dir-path]
  (let [file (io/file dir-path)]
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

(defn delete-files-recursively! [dir & [silently]]
  (let [dir-file (io/file dir)]
    (when (.exists dir-file)
      (when (.isDirectory dir-file)
        (doseq [file (.listFiles dir-file)]
          (delete-files-recursively! file silently)))
      (io/delete-file dir-file silently))))

(defn jar-uri? [path]
  (string/starts-with? path "jar:file:"))

(defn remove-postfix [s postfix]
  (if (string/ends-with? s postfix)
    (subs s 0 (- (count s) (count postfix)))
    s))

(defn remove-prefix [s prefix]
  (if (string/starts-with? s prefix)
    (subs s (count prefix))
    s))

(defn split-jar-uri [jar-uri]
  (let [[_ jar-path file-path] (re-matches #"^jar:file:(.*\.jar)!(.*)$" jar-uri)]
    [jar-path (remove-prefix file-path File/separator)]))

(defn relative-path [^File root-file ^File deep-file]
  (let [root-uri (.toURI root-file)
        deep-uri (.toURI deep-file)]
    (.getPath (.relativize root-uri deep-uri))))

; https://stackoverflow.com/a/16485210/84283
(defn normalize-jar-entry-path [path]
  (remove-postfix path File/separator))

(defn root-resource-item? [item]
  (and (:dir? item)
       (string/blank? (:path item))))

(defn filter-root-dir-from-resource-items [resource-items]
  (filter (complement root-resource-item?) resource-items))

(defn list-jar-resource-items [jar-path]
  (let [jar (JarFile. jar-path)
        entries (enumeration-seq (.entries jar))
        make-item (fn [^JarEntry file]
                    {:path (normalize-jar-entry-path (.getName file))
                     :dir? (.isDirectory file)})]
    (keep make-item entries)))

(defn list-disk-resource-items [dir-path]
  (let [dir-file (io/file dir-path)
        canonical-dir-path (str (.getCanonicalPath dir-file) File/separator)
        canonical-dir-path-len (count canonical-dir-path)
        make-item (fn [^File file]
                    (let [path (.getPath file)]
                      (if (string/starts-with? path canonical-dir-path)
                        {:path (subs path canonical-dir-path-len)
                         :dir? (.isDirectory file)})))]
    (keep make-item (file-seq dir-file))))

(defn filter-resource-items [prefix resources-items]
  (let [prefix-len (count prefix)
        xform-prefix (fn [desc]
                       (if (string/starts-with? (:path desc) prefix)
                         (update desc :path (fn [p] (subs p prefix-len)))))]
    (keep xform-prefix resources-items)))

(defn list-jar-resources-with-prefix [jar-path prefix-path]
  (let [all-descriptors (list-jar-resource-items jar-path)]
    (filter-resource-items (str prefix-path File/separator) all-descriptors)))

(defn list-resource-items [^URL resource]
  (assert (instance? URL resource))
  (filter-root-dir-from-resource-items
    (if (jar-uri? (str resource))
      (apply list-jar-resources-with-prefix (split-jar-uri (str resource)))
      (list-disk-resource-items resource))))

; see https://stackoverflow.com/a/48303746/84283
(defn copy-resources-into-dir! [root-resource target-dir]
  (let [root-resource-url (if (instance? URL root-resource)
                            root-resource
                            (io/resource root-resource))]
    (if (nil? root-resource-url)
      (throw (ex-info (str "Resource not found: '" root-resource "'"), {:resource root-resource}))
      (let [resource-items (list-resource-items root-resource-url)]
        (doseq [resource-item resource-items]
          (if-not (:dir? resource-item)
            (let [relative-path (:path resource-item)
                  resource-path (str root-resource-url File/separator relative-path)
                  resource-stream (io/input-stream (URL. resource-path))
                  target-path (io/file target-dir relative-path)]
              (io/make-parents target-path)
              (io/copy resource-stream target-path))))))))

; ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

(comment
  (filter-commented-lines ["# test comment"
                           "--enable-logging=stderr"
                           "# test comment"
                           "--v=1"
                           "# test comment"])
  (split-jar-uri "jar:file:/Users/darwin/.m2/repository/binaryage/dirac/1.5.1/dirac-1.5.1.jar!/dirac/playground-template")
  (list-jar-resource-items "/Users/darwin/.m2/repository/binaryage/dirac/1.5.1/dirac-1.5.1.jar")
  (list-disk-resource-items (.getCanonicalPath (io/file "resources/templates/dirac/playground-template")))

  (list-resource-items (URL. "jar:file:/Users/darwin/.m2/repository/binaryage/dirac/1.5.1/dirac-1.5.1.jar!/dirac/playground-template"))

  (copy-resources-into-dir! (URL. "jar:file:/Users/darwin/.m2/repository/binaryage/dirac/1.5.1/dirac-1.5.1.jar!/dirac/playground-template")
                            "/tmp/dirac-test/d1")

  (copy-resources-into-dir! (URL. (str "file:" (.getCanonicalPath (io/file "resources/templates/dirac/playground-template"))))
                            "/tmp/dirac-test/d2")

  (copy-resources-into-dir! "dirac/playground-template"
                            "/tmp/dirac-test/d3")

  )
