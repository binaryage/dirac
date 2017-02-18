(ns clj-webdriver.driver
  (:require [clojure.core.cache :as cache])
  (:import org.openqa.selenium.interactions.Actions))

(defrecord Driver [webdriver capabilities cache-spec actions])

(defn- init-cache
  "Initialize cache based on given strategy"
  ([cache-spec]
     (when (and (map? cache-spec)
                (seq cache-spec))
       (let [strategy-legend {:basic cache/basic-cache-factory,
                              :fifo cache/fifo-cache-factory,
                              :lru cache/lru-cache-factory,
                              :lirs cache/lirs-cache-factory,
                              :ttl cache/ttl-cache-factory,
                              :lu cache/lu-cache-factory}]
         (atom (apply
                (get strategy-legend (:strategy cache-spec))
                (:args cache-spec)))))))

(defn init-driver
  "Constructor for Driver records. Accepts either an existing WebDriver instance, or a `driver-spec` map with the following keys:

   webdriver - WebDriver instance
   cache-spec - map with keys :strategy, :args, :include and :exclude, used to setup caching rules"
  ([] (init-driver {}))
  ([driver-spec]
     (let [wd-class (Class/forName "org.openqa.selenium.WebDriver")
           uppers (supers (.getClass driver-spec))]
       (if (some #{wd-class} uppers)
         (Driver. driver-spec
                  nil
                  nil
                  (Actions. driver-spec))
         (let [{:keys [webdriver capabilities cache-spec]} driver-spec]
           (Driver. webdriver
                    capabilities
                    (assoc cache-spec :cache (init-cache cache-spec))
                    (Actions. webdriver)))))))

(defn driver?
  "Function to check class of a Driver, to prevent needing to import it"
  [driver]
  (= (class driver) Driver))
