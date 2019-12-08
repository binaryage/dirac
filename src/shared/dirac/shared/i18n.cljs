(ns dirac.shared.i18n)

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

(defn unable-to-resolve-backend-url [debugger-url tab-url reason]
  (str "Unable to resolve backend-url for given tab-url (via debugger-url).\n"
       (when (some? reason) (str "reason: " reason "\n"))
       "tab-url=" tab-url ", debugger-url=" debugger-url))

(defn debugger-url-not-specified []
  "Chrome debugger URL not specified. Check your Dirac options.")

(defn tab-cannot-be-debugged [tab]
  (str "This tab cannot be debugged: it has no tab url" tab))

(defn unable-to-complete-frontend-loading [frontend-tab-id reason]
  (str "Unable to complete initial frontend loading"
       (when (some? reason) (str ", reason: " reason))
       ". (frontend-tab-id=" frontend-tab-id ")"))

(defn unable-to-complete-intercom-initialization [frontend-tab-id reason]
  (str "Unable to complete intercom initialization"
       (when (some? reason) (str ", reason: " reason))
       ". (frontend-tab-id=" frontend-tab-id ")"))
