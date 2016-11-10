(ns dirac.i18n)

(def cannot-attach-help-url
  "https://github.com/binaryage/dirac/blob/master/docs/faq.md#getting-error-cannot-attach-dirac-devtools-what-now")

(defn unable-to-create-dirac-tab []
  "Unable to create a new tab for Dirac DevTools.")

(defn cannot-attach-dirac [debugger-url tab-url]
  (str "Cannot attach Dirac DevTools. "
       "Likely cause: another instance of DevTools is already attached.\n"
       "Don't you have internal DevTools open in the tab?\n"
       "See " cannot-attach-help-url ".\n"
       "tab-url=" tab-url ", debugger-url=" debugger-url))

(defn unable-to-resolve-backend-url [debugger-url tab-url]
  (str "Unable to resolve backend-url for given tab-url (via debugger-url)."
       "tab-url=" tab-url ", debugger-url=" debugger-url))

(defn debugger-url-not-specified []
  "Chrome debugger URL not specified. Check your Dirac options.")

(defn tab-cannot-be-debugged [tab]
  (str "This tab cannot be debugged: it has no tab url" tab))
