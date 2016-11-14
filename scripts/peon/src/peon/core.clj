(ns peon.core
  (:require [clojure.string :as string]
            [clojure.tools.cli :as cli]
            [clojure.java.io :as io]
            [cuerdas.core :as cuerdas])
  (:gen-class))

(def cli-options
  [["-i" "--input " "Input InspectorBackendCommands.js"]
   ["-o" "--output " "Output InspectorBackendCommands.js"]
   ["-r" "--chrome-rev " "Chrome revison"]
   ["-t" "--chrome-tag " "Chrome tag"]
   ["-h" "--help"]])

(defn usage [options-summary]
  (string/join \newline ["A helper tool for Dirac-related tasks."
                         ""
                         "Usage: peon sub-command [options]"
                         ""
                         "Commands: gen-backend-api"
                         ""
                         "Options:"
                         options-summary]))

(defn error-msg [errors]
  (str "The following errors occurred while parsing your command:\n"
       (string/join \newline errors)))

(defn exit [status msg]
  (println msg)
  (System/exit status))

(defn quote-js-string [s]
  (-> s
      (string/replace "\n" "\\n")
      (string/replace "'" "\\'")))

(defn make-js-string [s]
  (str "'" (quote-js-string s) "'"))

(defn make-js-string-with-new-line [s]
  (str "'" (quote-js-string s) "\\n'"))

(defn make-readable-js-string [s]
  (->> s
       (cuerdas/lines)
       (map make-js-string-with-new-line)
       (map #(str "+ " %))
       (cuerdas/unlines)))

(defn filter-api-registration-commands [lines]
  (let [* (fn [line]
            (let [sanitized-line (string/trim line)]
              (if-not (or (string/starts-with? sanitized-line "//")
                          (empty? sanitized-line))
                sanitized-line)))]
    (keep * lines)))

(defn get-api-meat [content]
  (-> content
      (cuerdas/lines)
      (filter-api-registration-commands)
      (cuerdas/unlines)))

(defn extract-css-definitions [content]
  (if-let [m (re-find #"SDK\.CSSMetadata\._generatedProperties = (\[.*\])" content)]
    (second m)
    (throw (ex-info "unable to extract CSS definitions" {:content content}))))

(defn get-css-meat [content]
  (-> content
      (extract-css-definitions)
      (string/replace "}," "},\n")))

(defn gen-backend-api! [options]
  (let [{:keys [input output chrome-rev chrome-tag]} options
        content (slurp input)
        meat (get-api-meat content)
        chrome-tag (str "Protocol.BakedInspectorBackendAPIChromeTag='" chrome-tag "';")
        chrome-rev (str "Protocol.BakedInspectorBackendAPIChromeRev='" chrome-rev "';")
        quoted-meat (str "Protocol.BakedInspectorBackendAPI=''\n" (make-readable-js-string meat) ";")
        result (string/join "\n" [chrome-tag chrome-rev quoted-meat])]
    (io/make-parents output)
    (spit output result)))

(defn gen-backend-css! [options]
  (let [{:keys [input output chrome-rev chrome-tag]} options
        content (slurp input)
        meat (get-css-meat content)
        chrome-tag (str "Protocol.BakedSupportedCSSPropertiesChromeTag='" chrome-tag "';")
        chrome-rev (str "Protocol.BakedSupportedCSSPropertiesChromeRev='" chrome-rev "';")
        quoted-meat (str "Protocol.BakedSupportedCSSProperties=''\n" (make-readable-js-string meat) ";")
        result (string/join "\n" [chrome-tag chrome-rev quoted-meat])]
    (io/make-parents output)
    (spit output result)))

(defn -main [& args]
  (let [{:keys [arguments options errors summary]} (cli/parse-opts args cli-options)]
    (cond
      (:help options) (exit 0 (usage summary))
      errors (exit 1 (error-msg errors)))
    (if-let [command (first arguments)]
      (case command
        "gen-backend-api" (gen-backend-api! options)
        "gen-backend-css" (gen-backend-css! options)
        (exit 2 (str "Unknown sub-command '" command "'. Please run `peon --help` for usage info.")))
      (exit 3 (usage summary)))))
