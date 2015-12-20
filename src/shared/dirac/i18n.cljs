(ns dirac.i18n
  (:require [goog.string :as gstring]
            [goog.string.format]
            [chromex.support :refer-macros [oget ocall oapply]]
            [chromex.logging :refer-macros [log info warn error group group-end]]
            [clojure.string :as string]))

(defn unable-to-extract-first-tab []
  "Unable to extract first tab id from newly created DevTools window.")

(defn cannot-attach-dirac [target-url tab-url]
  (str "Cannot attach Dirac DevTools. "
       "Likely cause: another instance of DevTools is already attached. "
       "target-url=" target-url ", tab-url=" tab-url))

(defn unable-to-resolve-backend-url [target-url tab-url]
  (str "Unable to resolve backend-url for Dirac DevTools. "
       "target-url=" target-url ", tab-url=" tab-url))

(defn target-url-not-specified []
  "Target URL for attachment not specified. Check your Dirac options.")

(defn tab-cannot-be-debugged [tab]
  (str "This tab cannot be debugged: it has no tab url" tab))