(ns dirac.options.model)

(def default-options
  {:target-url "http://localhost:9222"})

(defn get-options []
  default-options)                                                                                                            ; TODO: build UI (https://developer.chrome.com/extensions/optionsV2)

(defn get-option [key]
  (key (get-options)))