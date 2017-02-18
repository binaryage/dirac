;; ## Core by-* Functions ##
;;
;; These functions are low-level equivalents for the
;; `ByFoo` classes that make up the Java API, with a few
;; notable exceptions that provide more flexible matching
;; (see the `by-attr*` functions at the bottom)
(in-ns 'clj-webdriver.core)

(defn by-id
  "Used when finding elements. Returns `By/id` of `expr`"
  [expr]
  (By/id (name expr)))

(defn by-link-text
  "Used when finding elements. Returns `By/linkText` of `expr`"
  [expr]
  (By/linkText expr))

(defn by-partial-link-text
  "Used when finding elements. Returns `By/partialLinkText` of `expr`"
  [expr]
  (By/partialLinkText expr))

(defn by-name
  "Used when finding elements. Returns `By/name` of `expr`"
  [expr]
  (By/name (name expr)))

(defn by-tag
  "Used when finding elements. Returns `By/tagName` of `expr`"
  [expr]
  (By/tagName (name expr)))

(defn by-xpath
  "Used when finding elements. Returns `By/xpath` of `expr`"
  [expr]
  (By/xpath expr))

(defn by-css
  "Used when finding elements. Returns `By/cssSelector` of `expr`"
  [expr]
  (By/cssSelector expr))

(def by-css-selector by-css)

(defn by-query
  "Given a map with either an `:xpath` or `:css` key, return the respective by-* function (`by-xpath` or `by-css`) using the value for that key."
  [{:keys [xpath css] :as m}]
  (cond
    xpath (by-xpath (:xpath m))
    css (by-css (:css m))
    :else (throw (IllegalArgumentException. "You must provide either an `:xpath` or `:css` entry."))))

(defn by-class-name
  "Used when finding elements. Returns `By/className` of `expr`"
  [expr]
  (let [expr (str expr)]
    (if (re-find #"\s" expr)
      (let [classes (string/split expr #"\s+")
            class-query (string/join "." classes)]
        (by-css (str "*." class-query)))
      (By/className (name expr)))))

;; Inspired by the `attr=`, `attr-contains` in Christophe Grand's enlive
(defn by-attr=
  "Use `value` of arbitrary attribute `attr` to find an element. You can optionally specify the tag.
   For example: `(by-attr= :id \"element-id\")`
                `(by-attr= :div :class \"content\")`"
  ([attr value] (by-attr= :* attr value)) ; default to * any tag
  ([tag attr value]
     (cond
         (= :class attr)  (if (re-find #"\s" value)
                            (let [classes (string/split value #"\s+")
                                  class-query (string/join "." classes)]
                              (by-css (str (name tag) class-query)))
                            (by-class-name value))
         (= :id attr)     (by-id value)
         (= :name attr)   (by-name value)
         (= :tag attr)    (by-tag value)
         (= :text attr)   (if (= tag :a)
                            (by-link-text value)
                            (by-xpath (str "//"
                                           (name tag)
                                           "[text()"
                                           "=\"" value "\"]")))
         :else   (by-css (str (name tag)
                              "[" (name attr) "='" value "']")))))

(defn by-attr-contains
  "Match if `value` is contained in the value of `attr`. You can optionally specify the tag.
   For example: `(by-attr-contains :class \"navigation\")`
                `(by-attr-contains :ul :class \"tags\")`"
  ([attr value] (by-attr-contains :* attr value)) ; default to * any tag
  ([tag attr value]
     (by-css (str (name tag)
                  "[" (name attr) "*='" value "']"))))

(defn by-attr-starts
  "Match if `value` is at the beginning of the value of `attr`. You can optionally specify the tag."
  ([attr value] (by-attr-starts :* attr value))
  ([tag attr value]
     (by-css (str (name tag)
                  "[" (name attr) "^='" value "']"))))

(defn by-attr-ends
  "Match if `value` is at the end of the value of `attr`. You can optionally specify the tag."
  ([attr value] (by-attr-ends :* attr value))
  ([tag attr value]
     (by-css (str (name tag)
                  "[" (name attr) "$='" value "']"))))

(defn by-has-attr
  "Match if the element has the attribute `attr`, regardless of its value. You can optionally specify the tag."
  ([attr] (by-has-attr :* attr))
  ([tag attr]
     (by-css (str (name tag)
                  "[" (name attr) "]"))))
