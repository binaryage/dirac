(ns clj-webdriver.element)

(defrecord Element [webelement])

(defn init-element
  "Initialize an Element record"
  ([] (Element. nil))
  ([webelement] (Element. webelement)))

(defn init-elements
  "Given WebElement objects, batch initialize elements (for things like returning all options for select lists)"
  [webelements]
  (for [webel webelements]
    (init-element webel)))

(defn element?
  "Return true if parameter is an Element record"
  [element]
  (= (class element) Element))

(defn element-like?
  "Return true if parameter is either an Element record or a map with a :webelement entry"
  [element]
  (or (element? element)
      (and (map? element)
           (contains? element :webelement))))