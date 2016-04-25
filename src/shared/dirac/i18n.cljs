(ns dirac.i18n)

(defn unable-to-create-dirac-tab []
  "Unable to create a new tab for Dirac DevTools.")

(defn cannot-attach-dirac [target-url tab-url]
  (str "Cannot attach Dirac DevTools. "
       "Likely cause: another instance of DevTools is already attached. "
       "target-url=" target-url ", tab-url=" tab-url))

(defn unable-to-resolve-backend-url [target-url tab-url]
  (str "Unable to resolve backend-url for Dirac DevTools. "
       "target-url=" target-url ", tab-url=" tab-url))

(defn target-url-not-specified []
  "Target URL not specified. Check your Dirac options.")

(defn tab-cannot-be-debugged [tab]
  (str "This tab cannot be debugged: it has no tab url" tab))