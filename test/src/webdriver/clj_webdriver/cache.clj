;; ## Element Caching ##
;;
;; Due to how Selenium-WebDriver deals with elements on a page,
;; even if the same element is queried in an identical way,
;; there is no way to test the equivalence of the element. A new
;; object is created every time an element is "discovered" on the page.
;;
;; If you've enabled caching for your Driver and provided a set of cache rules
;; for the cache to abide by, when you call `find-element` or `find-elements`,
;; the cache system makes the following checks:
;;
;;  * Is this `find-element` request on the same page as the previous? If a new page is loaded, the cache is reset anyway.
;;  * Is this `find-element` request already in the cache? If so, return it. If not, find element on page.
;;  * Once element is found, does this element conform to a cache rule? If so, cache it.
;;
;; Cache rules must be based on the query used to acquire the element.
;; The cache rules are defined as a vector of maps that match queries you want
;; to include/exclude.
;;
;; Here are two examples:
;;
;;     {:include [ {:class "foo"}
;;                 {:css "ul.menu a"} ]}
;;
;;     {:exclude [ {:query [:div {:id "content"}, :a {:class "external"}]},
;;                 {:xpath "//h1"}  ]}
;;
;; You may either choose a whitelisting approach with `:include` or a blacklisting
;; approach with `:exclude`, but not both.
;;
;; For the sake of API sanity, if you create a cache rule based on css, xpath,
;; or ancestry-based queries, the match must be exact.
;;
;; Cache rules are evaluated in order, so put most-frequently-used cache rules
;; at the beginning of the vector.
;;

(ns clj-webdriver.cache
  (:use [clj-webdriver.element :only [element?]])
  (:require [clojure.tools.logging :as log]
            clj-webdriver.driver)
  (:import clj_webdriver.driver.Driver))

;; Possible values are `:keep`, `:check`, `:flush`
(def status (atom :keep))

;; Functions we need, but don't want circular deps in namespaces
(defn- current-url [driver]
    (.getCurrentUrl (:webdriver driver)))

(defn get-cache
  [driver]
  (get-in driver [:cache-spec :cache]))

(defprotocol IElementCache
  "Cache for WebElement objects over the lifetime of a Driver on a given page"
  (cache-enabled? [driver] "Determine if caching is enabled for this record")
  (cacheable? [driver query] "Based on the driver's cache rules, determine if the given query is allowed to be cached")
  (in-cache? [driver query] "Check if cache contains an element")
  (cache-url [driver] "Retrieve the URL all elements are currently being cached for")
  (set-cache-url [driver url] "Set a new URL under which all elements will be cached")
  (insert [driver query value] "Insert a value into the cache")
  (retrieve [driver query] "Retrieve an element from the cache")
  (delete [driver query] "Delete the cached value at `query`")
  (seed
    [driver]
    [driver seed-value] "Replace all contents of cache with `seed-value`"))

(extend-type Driver

  IElementCache
  (cache-enabled? [driver]
    (get-in driver [:cache-spec :strategy]))

  (in-cache? [driver raw-query]
    (when (cache-enabled? driver)
      (let [query (cond
                 (vector? raw-query)  {:query raw-query}
                 (keyword? raw-query) {:query [raw-query]}
                 :else                raw-query)]
      (contains? @(get-cache driver) query))))

  ;; here the query needs the same normalizing as occurs
  ;; in the cacheable? function below
  (insert [driver raw-query value]
    (let [query (cond
                 (vector? raw-query)  {:query raw-query}
                 (keyword? raw-query) {:query [raw-query]}
                 :else                raw-query)]
      (log/debug (str "[x] Inserting " query " entry into cache."))
      (if (or (element? value) (not (seq? value)))
        ;; value found with find-element, conj onto list
        (swap! (get-cache driver) update-in [query] conj value)
        ;; values found with find-elements, concat onto list
        (swap! (get-cache driver) update-in [query] concat value))))

  (retrieve [driver raw-query]
    (let [query (cond
                 (vector? raw-query)  {:query raw-query}
                 (keyword? raw-query) {:query [raw-query]}
                 :else                raw-query)]
      (log/debug (str "[x] Retrieving " query " entry from cache."))
      (get @(get-cache driver) query)))

  (cache-url [driver]
    (get @(get-cache driver) :url))

  (set-cache-url [driver url]
    (swap! (get-cache driver) assoc :url url))

  (delete [driver raw-query]
    (let [query (cond
                 (vector? raw-query)  {:query raw-query}
                 (keyword? raw-query) {:query [raw-query]}
                 :else                raw-query)]
     (swap! (get-cache driver) dissoc query)))

  (seed
    ([driver]
       (when (cache-enabled? driver)
         (reset!
          (get-cache driver)
          {:url (current-url driver)})))
    ([driver seed-value]
       (when (cache-enabled? driver)
         (reset! (get-cache driver) seed-value))))

  (cacheable? [driver raw-query]
    ;; normalize query
    (let [query (cond
                 (vector? raw-query)  {:query raw-query}
                 (keyword? raw-query) {:query [raw-query]}
                 :else                raw-query)]
      (if (contains? (:cache-spec driver) :exclude)
        ;; handle excludes
        (not-any? (fn [exclude-item] (= query exclude-item))
                   (get-in driver [:cache-spec :exclude]))
        ;; handle includes
        (some (fn [include-item] (= query include-item))
              (get-in driver [:cache-spec :include]))))))

(defn set-status
  "Change the current cache status"
  [st]
  {:pre [(or (= st :keep)
             (= st :check)
             (= st :flush))]}
  (reset! status st)
  st)

(defn check-status
  "Check cache status, delete if needed"
  [driver]
  (when (cache-enabled? driver)
    (case @status
      :flush (do
               (seed driver)
               (set-status :keep))
      :check (if-not (= (current-url driver) (cache-url driver))
               (do
                 (seed driver)
                 (set-status :keep))
               (set-status :keep))
      (set-status :keep))))
