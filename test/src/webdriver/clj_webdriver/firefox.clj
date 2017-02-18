(ns clj-webdriver.firefox
  (:require [clojure.java.io :as io])
  (:import org.openqa.selenium.firefox.FirefoxProfile))

(defn new-profile
  "Create an instance of `FirefoxProfile`"
  ([] (FirefoxProfile.))
  ([profile-dir] (FirefoxProfile. (io/file profile-dir))))

(defn enable-extension
  "Given a `FirefoxProfile` object, enable an extension. The `extension` argument should be something clojure.java.io/as-file will accept."
  [profile extension]
  (.addExtension profile (io/as-file extension)))

(defn set-preferences
  "Given a `FirefoxProfile` object and a map of preferences, set the preferences for the profile."
  [profile pref-map]
  (doseq [entry pref-map]
    (.setPreference profile (name (key entry)) (val entry))))

(defn accept-untrusted-certs
  "Set whether or not Firefox should accept untrusted certificates."
  [profile bool]
  (.setAcceptUntrustedCertificates profile bool))

(defn enable-native-events
  "Set whether or not native events should be enabled (true by default on Windows, false on other platforms)."
  [profile bool]
  (.setEnableNativeEvents profile bool))

(defn is-running
  "Return true if the profile in the given `profile-dir` is the one running"
  [profile profile-dir]
  (.isRunning profile (io/file profile-dir)))

(defn write-to-disk
  "Write the given profile to disk. Makes sense when building up an anonymous profile via clj-webdriver."
  [profile]
  (.layoutOnDisk profile))

(defn json
  "Return JSON representation of the given `profile` (can be used to read the profile back in via `profile-from-json`"
  [profile]
  (.toJson profile))

(defn profile-from-json
  "Instantiate a new FirefoxProfile from a proper JSON representation."
  [^String json]
  (FirefoxProfile/fromJson json))
