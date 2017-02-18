;; ## Core Element-related Functions ##
;;
;; This namespace implements the following protocols:
;;
;;  * IElement
;;  * IFormElement
;;  * ISelectElement
(in-ns 'clj-webdriver.core)

(defn rectangle
  [element]
  (let [loc (location element)
        el-size (size element)]
    (java.awt.Rectangle. (:x loc)
                         (:y loc)
                         (:width el-size)
                         (:height el-size))))

(extend-type Element

  ;; Element action basics
  IElement
  (attribute [element attr]
    (if (= attr :text)
      (text element)
      (let [attr (name attr)
            boolean-attrs ["async", "autofocus", "autoplay", "checked", "compact", "complete",
                           "controls", "declare", "defaultchecked", "defaultselected", "defer",
                           "disabled", "draggable", "ended", "formnovalidate", "hidden",
                           "indeterminate", "iscontenteditable", "ismap", "itemscope", "loop",
                           "multiple", "muted", "nohref", "noresize", "noshade", "novalidate",
                           "nowrap", "open", "paused", "pubdate", "readonly", "required",
                           "reversed", "scoped", "seamless", "seeking", "selected", "spellcheck",
                           "truespeed", "willvalidate"]
            webdriver-result (.getAttribute (:webelement element) (name attr))]
        (if (some #{attr} boolean-attrs)
          (when (= webdriver-result "true")
            attr)
          webdriver-result))))

  (click [element]
    (.click (:webelement element))
    (cache/set-status :check)
    nil)

  (css-value [element property]
    (.getCssValue (:webelement element) property))

  (displayed? [element]
    (.isDisplayed (:webelement element)))

  (exists? [element]
    (not (nil? (:webelement element))))

  (flash [element]
    (let [original-color (if (css-value element "background-color")
                           (css-value element "background-color")
                           "transparent")
          orig-colors (repeat original-color)
          change-colors (interleave (repeat "red") (repeat "blue"))]
      (doseq [flash-color (take 12 (interleave change-colors orig-colors))]
        (execute-script* (.getWrappedDriver (:webelement element))
                         (str "arguments[0].style.backgroundColor = '"
                              flash-color "'")
                         (:webelement element))
        (Thread/sleep 80)))
    element)

  (focus [element]
    (execute-script*
     (.getWrappedDriver (:webelement element)) "return arguments[0].focus()" (:webelement element))
    element)

  (html [element]
    (browserbot (.getWrappedDriver (:webelement element)) "getOuterHTML" (:webelement element)))

  (location [element]
    (let [loc (.getLocation (:webelement element))
          x   (.x loc)
          y   (.y loc)]
      {:x x, :y y}))

  (location-once-visible [element]
    (let [loc (.getLocationOnScreenOnceScrolledIntoView (:webelement element))
          x   (.x loc)
          y   (.y loc)]
      {:x x, :y y}))

  (present? [element]
    (and (exists? element) (visible? element)))

  (size [element]
    (let [size-obj (.getSize (:webelement element))
          w (.width size-obj)
          h (.height size-obj)]
      {:width w, :height h}))

  (intersects? [element-a element-b]
    (let [rect-a (rectangle element-a)
          rect-b (rectangle element-b)]
      (.intersects rect-a rect-b)))

  (tag [element]
    (.getTagName (:webelement element)))

  (text [element]
    (.getText (:webelement element)))

  (value [element]
    (.getAttribute (:webelement element) "value"))

  (visible? [element]
    (.isDisplayed (:webelement element)))

  (xpath [element]
    (browserbot (.getWrappedDriver (:webelement element)) "getXPath" (:webelement element) []))


  IFormElement
  (deselect [element]
    (if (.isSelected (:webelement element))
      (toggle (:webelement element))
      element))

  (enabled? [element]
    (.isEnabled (:webelement element)))

  (input-text [element s]
    (.sendKeys (:webelement element) (into-array CharSequence (list s)))
    element)

  (submit [element]
    (.submit (:webelement element))
    (cache/set-status :flush)
    nil)

  (clear [element]
    (.clear (:webelement element))
    element)

  (select [element]
    (if-not (.isSelected (:webelement element))
      (.click (:webelement element))
      element))

  (selected? [element]
    (.isSelected (:webelement element)))

  (send-keys [element s]
    (.sendKeys (:webelement element) (into-array CharSequence (list s)))
    element)

  (toggle [element]
    (.click (:webelement element))
    element)


  ISelectElement
  (all-options [element]
    (let [select-list (Select. (:webelement element))]
      (lazy-seq (init-elements (.getOptions select-list)))))

  (all-selected-options [element]
    (let [select-list (Select. (:webelement element))]
      (lazy-seq (init-elements (.getAllSelectedOptions select-list)))))

  (deselect-option [element attr-val]
    {:pre [(or (= (first (keys attr-val)) :index)
               (= (first (keys attr-val)) :value)
               (= (first (keys attr-val)) :text))]}
    (case (first (keys attr-val))
      :index (deselect-by-index element (:index attr-val))
      :value (deselect-by-value element (:value attr-val))
      :text  (deselect-by-text element (:text attr-val))))

  (deselect-all [element]
    (let [cnt-range (->> (all-options element)
                         count
                         (range 0))]
      (doseq [idx cnt-range]
        (deselect-by-index element idx))
      element))

  (deselect-by-index [element idx]
    (let [select-list (Select. (:webelement element))]
      (.deselectByIndex select-list idx)
      element))

  (deselect-by-text [element text]
    (let [select-list (Select. (:webelement element))]
      (.deselectByVisibleText select-list text)
      element))

  (deselect-by-value [element value]
    (let [select-list (Select. (:webelement element))]
      (.deselectByValue select-list value)
      element))

  (first-selected-option [element]
    (let [select-list (Select. (:webelement element))]
      (init-element (.getFirstSelectedOption select-list))))

  (multiple? [element]
    (let [value (attribute element "multiple")]
      (or (= value "true")
          (= value "multiple"))))

  (select-option [element attr-val]
    {:pre [(or (= (first (keys attr-val)) :index)
               (= (first (keys attr-val)) :value)
               (= (first (keys attr-val)) :text))]}
    (case (first (keys attr-val))
      :index (select-by-index element (:index attr-val))
      :value (select-by-value element (:value attr-val))
      :text  (select-by-text element (:text attr-val))))

  (select-all [element]
    (let [cnt-range (->> (all-options element)
                         count
                         (range 0))]
      (doseq [idx cnt-range]
        (select-by-index element idx))
      element))

  (select-by-index [element idx]
    (let [select-list (Select. (:webelement element))]
      (.selectByIndex select-list idx)
      element))

  (select-by-text [element text]
    (let [select-list (Select. (:webelement element))]
      (.selectByVisibleText select-list text)
      element))

  (select-by-value [element value]
    (let [select-list (Select. (:webelement element))]
      (.selectByValue select-list value)
      element))

  IFind
  (find-element-by [element by]
    (let [by (if (map? by)
               (by-query (build-query by :local))
               by)]
      (init-element (.findElement (:webelement element) by))))

  (find-elements-by [element by]
    (let [by (if (map? by)
               (by-query (build-query by :local))
               by)
          els (.findElements (:webelement element) by)]
      (if (seq els)
        (map init-element els)
        (map init-element [nil]))))

  (find-element [element by]
    (find-element-by element by))

  (find-elements [element by]
    (find-elements-by element by)))

;;
;; Extend the protocol to regular Clojure maps
;;

(extend-protocol IElement
  clojure.lang.IPersistentMap

  (attribute   [m attr] (attribute (map->Element m) attr))

  (click       [m] (click (map->Element m)))

  (css-value   [m property] (css-value (map->Element m) property))

  (displayed?  [m] (displayed? (map->Element m)))

  (exists?     [m] (exists? (map->Element m)))

  (flash       [m] (flash (map->Element m)))

  (focus [m] (focus (map->Element m)))

  (html [m] (html (map->Element m)))

  (location [m] (location (map->Element m)))

  (location-once-visible [m] (location-once-visible (map->Element m)))

  (present? [m] (present? (map->Element m)))

  (size [m] (size (map->Element m)))

  (rectangle [m] (rectangle (map->Element m)))

  (intersects? [m-a m-b] (intersects? (map->Element m-a) (map->Element m-b)))

  (tag [m] (tag (map->Element m)))

  (text [m] (text (map->Element m)))

  (value [m] (value (map->Element m)))

  (visible? [m] (visible? (map->Element m)))

  (xpath [m] (xpath (map->Element m))))

(extend-protocol IFormElement
  clojure.lang.IPersistentMap

  (deselect [m] (deselect (map->Element m)))

  (enabled? [m] (enabled? (map->Element m)))

  (input-text [m s] (input-text (map->Element m) s))

  (submit [m] (submit (map->Element m)))

  (clear [m] (clear (map->Element m)))

  (select [m] (select (map->Element m)))

  (selected? [m] (selected? (map->Element m)))

  (send-keys [m s] (send-keys (map->Element m) s))

  (toggle [m] (toggle (map->Element m))))

(extend-protocol ISelectElement
  clojure.lang.IPersistentMap

  (all-options [m] (all-options (map->Element m)))

  (all-selected-options [m] (all-selected-options (map->Element m)))

  (deselect-option [m attr-val] (deselect-option (map->Element m) attr-val))

  (deselect-all [m] (deselect-all (map->Element m)))

  (deselect-by-index [m idx] (deselect-by-index (map->Element m) idx))

  (deselect-by-text [m text] (deselect-by-text (map->Element m) text))

  (deselect-by-value [m value] (deselect-by-value (map->Element m) value))

  (first-selected-option [m] (first-selected-option (map->Element m)))

  (multiple? [m] (multiple? (map->Element m)))

  (select-option [m attr-val] (select-option (map->Element m) attr-val))

  (select-all [m] (select-all (map->Element m)))

  (select-by-index [m idx] (select-by-index (map->Element m) idx))

  (select-by-text [m text] (select-by-text (map->Element m) text))

  (select-by-value [m value] (select-by-value (map->Element m) value)))

(extend-protocol IFind
  clojure.lang.IPersistentMap

  (find-element-by [m by] (find-element-by (map->Element m) by))

  (find-elements-by [m by] (find-elements-by (map->Element m) by))

  (find-element [m by] (find-element (map->Element m) by))

  (find-elements [m by] (find-elements (map->Element m) by)))

;;
;; Extend Element-related protocols to `nil`,
;; so our nil-handling is clear.
;;

(extend-protocol IElement
  nil

  (attribute   [n attr] (throw-nse))

  (click       [n] (throw-nse))

  (css-value   [n property] (throw-nse))

  (displayed?  [n] (throw-nse))

  (exists?     [n] false)

  (flash       [n] (throw-nse))

  (focus [n] (throw-nse))

  (html [n] (throw-nse))

  (location [n] (throw-nse))

  (location-once-visible [n] (throw-nse))

  (present? [n] (throw-nse))

  (size [n] (throw-nse))

  (rectangle [n] (throw-nse))

  (intersects? [n m-b] (throw-nse))

  (tag [n] (throw-nse))

  (text [n] (throw-nse))

  (value [n] (throw-nse))

  (visible? [n] (throw-nse))

  (xpath [n] (throw-nse)))

(extend-protocol IFormElement
  nil

  (deselect [n] (throw-nse))

  (enabled? [n] (throw-nse))

  (input-text [n s] (throw-nse))

  (submit [n] (throw-nse))

  (clear [n] (throw-nse))

  (select [n] (throw-nse))

  (selected? [n] (throw-nse))

  (send-keys [n s] (throw-nse))

  (toggle [n] (throw-nse)))

(extend-protocol ISelectElement
  nil

  (all-options [n] (throw-nse))

  (all-selected-options [n] (throw-nse))

  (deselect-option [n attr-val] (throw-nse))

  (deselect-all [n] (throw-nse))

  (deselect-by-index [n idx] (throw-nse))

  (deselect-by-text [n text] (throw-nse))

  (deselect-by-value [n value] (throw-nse))

  (first-selected-option [n] (throw-nse))

  (multiple? [n] (throw-nse))

  (select-option [n attr-val] (throw-nse))

  (select-all [n] (throw-nse))

  (select-by-index [n idx] (throw-nse))

  (select-by-text [n text] (throw-nse))

  (select-by-value [n value] (throw-nse)))

(extend-protocol IFind
  nil

  (find-element-by [n by] (throw-nse))

  (find-elements-by [n by] (throw-nse))

  (find-element [n by] (throw-nse))

  (find-elements [n by] (throw-nse)))