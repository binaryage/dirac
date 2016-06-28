(ns dirac.runtime.core
  (:require [clojure.string :as string]))

(def known-browsers ["Opera" "IE" "Edge" "Firefox" "Safari" "Coast" "Chrome" "Silk"])

(defmacro get-current-browser-name
  ([]
   `(get-current-browser-name ~known-browsers))
  ([browsers]
   (let [gen-browser-test (fn [browser-name]
                            (let [browser-check (symbol "goog.labs.userAgent.browser" (str "is" browser-name))]               ; e.g. goog.labs.userAgent.browser/isChrome
                              `(if (~browser-check) ~browser-name)))
         gen-browser-tests (map gen-browser-test browsers)]
     `(string/join ", " (remove nil? [~@gen-browser-tests])))))

(def known-platforms [["Android" "Android"]
                      ["Ipod" "iPod"]
                      ["Iphone" "iPhone"]
                      ["Ipad" "iPad"]
                      ["Macintosh" "Mac"]
                      ["Linux" "Linux"]
                      ["Windows" "Windows"]
                      ["ChromeOS" "ChromeOS"]])

(defmacro get-current-platform-name
  ([]
   `(get-current-platform-name ~known-platforms))
  ([platforms]
   (let [gen-platform-test (fn [[platform-key platform-name]]
                             (let [platform-check (symbol "goog.labs.userAgent.platform" (str "is" platform-key))]            ; e.g. goog.labs.userAgent.platform/isMacintosh
                               `(if (~platform-check) ~platform-name)))
         gen-platform-tests (map gen-platform-test platforms)]
     `(string/join ", " (remove nil? [~@gen-platform-tests])))))
