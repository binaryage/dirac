;; ## Core Driver-related Functions ##

;; This namespace provides the implementations for the following
;; protocols:

;;  * IDriver
;;  * ITargetLocator
;;  * IAlert
;;  * IOptions
;;  * IFind
(in-ns 'clj-webdriver.core)

(declare find-element* find-elements*)

(extend-type Driver

  ;; Basic Functions
  IDriver
  (back [driver]
    (.back (.navigate (:webdriver driver)))
    (cache/seed driver)
    driver)

  (close [driver]
    (let [handles (window-handles* (:webdriver driver))]
      (if (> (count handles) 1) ; get back to a window that is open before proceeding
        (let [this-handle (window-handle* (:webdriver driver))
              idx (.indexOf handles this-handle)]
          (cond
           (zero? idx)
           (do                       ; if first window, switch to next
             (.close (:webdriver driver))
             (switch-to-window driver (nth handles (inc idx))))

           :else
           (do                     ; otherwise, switch back one window
             (.close (:webdriver driver))
             (switch-to-window driver (nth handles (dec idx)))))
          (cache/seed driver {}))
        (do
          (.close (:webdriver driver))
          (cache/seed driver {})))))

  (current-url [driver]
    (.getCurrentUrl (:webdriver driver)))

  (forward [driver]
    (.forward (.navigate (:webdriver driver)))
    (cache/seed driver)
    driver)

  (get-url [driver url]
    (.get (:webdriver driver) url)
    (cache/seed driver)
    driver)

  (get-screenshot
    ([driver] (get-screenshot driver :file))
    ([driver format] (get-screenshot driver format nil))
    ([driver format destination]
       {:pre [(or (= format :file)
                  (= format :base64)
                  (= format :bytes))]}
       (let [wd (:webdriver driver)
             output (case format
                      :file (.getScreenshotAs wd OutputType/FILE)
                      :base64 (.getScreenshotAs wd OutputType/BASE64)
                      :bytes (.getScreenshotAs wd OutputType/BYTES))]
         (if destination
           (do
             (io/copy output (io/file destination))
             (log/info "Screenshot written to destination")
             output)
           output))))

  (page-source [driver]
    (.getPageSource (:webdriver driver)))

  (quit [driver]
    (.quit (:webdriver driver))
    (cache/seed driver {}))

  (refresh [driver]
    (.refresh (.navigate (:webdriver driver)))
    (cache/seed driver)
    driver)

  (title [driver]
    (.getTitle (:webdriver driver)))

  (to [driver url]
    (.to (.navigate (:webdriver driver)) url)
    (cache/seed driver)
    driver)


  ;; Window and Frame Handling
  ITargetLocator
  ;; TODO (possible): multiple arities; only driver, return current window handle; driver and query, return matching window handle
  (window [driver]
    (win/init-window (:webdriver driver)
                     (.getWindowHandle (:webdriver driver))
                     (title driver)
                     (current-url driver)))

  (windows [driver]
    (let [current-handle (.getWindowHandle (:webdriver driver))
          all-handles (lazy-seq (.getWindowHandles (:webdriver driver)))
          handle-records (for [handle all-handles]
                           (let [b (switch-to-window driver handle)]
                             (win/init-window (:webdriver driver)
                                              handle
                                              (title b)
                                              (current-url b))))]
      (switch-to-window driver current-handle)
      handle-records))

  (other-windows [driver]
    (remove #(= (:handle %) (:handle (window driver)))
            (doall (windows driver))))

  (switch-to-frame [driver frame]
    (.frame (.switchTo (:webdriver driver))
            (if (element? frame)
              (:webelement frame)
              frame))
    driver)

  (switch-to-window [driver window]
    (cond
     (string? window)
     (do
       (.window (.switchTo (:webdriver driver)) window)
       driver)

     (win/window? window)
     (do
       (.window (.switchTo (:driver window)) (:handle window))
       driver)

     (number? window)
     (do
       (switch-to-window driver (nth (windows driver) window))
       driver)

     (nil? window)
     (throw (RuntimeException. "No window can be found"))

     :else
     (do
       (.window (.switchTo (:webdriver driver)) window)
       driver)))

  (switch-to-other-window [driver]
    (if (not= (count (windows driver)) 2)
      (throw (RuntimeException.
              (str "You may only use this function when two and only two "
                   "browser windows are open.")))
      (switch-to-window driver (first (other-windows driver)))))

  (switch-to-default [driver]
    (.defaultContent (.switchTo (:webdriver driver))))

  (switch-to-active [driver]
    (.activeElement (.switchTo (:webdriver driver))))


  ;; Options Interface (cookies)
  IOptions
  (add-cookie [driver cookie-spec]
    (.addCookie (.manage (:webdriver driver)) (:cookie (init-cookie cookie-spec)))
    driver)

  (delete-cookie-named [driver cookie-name]
    (.deleteCookieNamed (.manage (:webdriver driver)) cookie-name)
    driver)

  (delete-cookie [driver cookie-spec]
    (.deleteCookie (.manage (:webdriver driver)) (:cookie (init-cookie cookie-spec)))
    driver)

  (delete-all-cookies [driver]
    (.deleteAllCookies (.manage (:webdriver driver)))
    driver)

  (cookies [driver]
    (set (map #(init-cookie {:cookie %})
                   (.getCookies (.manage (:webdriver driver))))))

  (cookie-named [driver cookie-name]
    (let [cookie-obj (.getCookieNamed (.manage (:webdriver driver)) cookie-name)]
      (init-cookie {:cookie cookie-obj})))

  ;; Alert dialogs
  IAlert
  (accept [driver]
    (-> driver :webdriver .switchTo .alert .accept))

  (alert-obj [driver]
    (-> driver :webdriver .switchTo .alert))

  (alert-text [driver]
    (-> driver :webdriver .switchTo .alert .getText))

  ;; (authenticate-using [driver username password]
  ;;   (let [creds (UserAndPassword. username password)]
  ;;     (-> driver :webdriver .switchTo .alert (.authenticateUsing creds))))

  (dismiss [driver]
    (-> driver :webdriver .switchTo .alert .dismiss))

  ;; Find Functions
  IFind
  (find-element-by [driver by-value]
    (let [by-value (if (map? by-value)
                     (by-query (build-query by-value))
                     by-value)]
      (init-element (.findElement (:webdriver driver) by-value))))

  (find-elements-by [driver by-value]
    (let [by-value (if (map? by-value)
               (by-query (build-query by-value))
               by-value)
          els (.findElements (:webdriver driver) by-value)]
      (if (seq els)
        (lazy-seq (map init-element els))
        (lazy-seq nil))))

  (find-windows [driver attr-val]
    (if (contains? attr-val :index)
      [(nth (windows driver) (:index attr-val))] ; vector for consistency below
      (filter #(every? (fn [[k v]] (if (= java.util.regex.Pattern (class v))
                                    (re-find v (k %))
                                    (= (k %) v)))
                       attr-val) (windows driver))))

  (find-window [driver attr-val]
    (first (find-windows driver attr-val)))

  (find-table-cell [driver table coords]
    (when (not= (count coords) 2)
      (throw (IllegalArgumentException.
              (str "The `coordinates` parameter must be a seq with two items."))))
    (let [[row col] coords
          row-css (str "tr:nth-child(" (inc row) ")")
          col-css (if (and (find-element-by table (by-tag "th"))
                             (zero? row))
                      (str "th:nth-child(" (inc col) ")")
                      (str "td:nth-child(" (inc col) ")"))
          complete-css (str row-css " " col-css)]
      (find-element-by table (by-query {:css complete-css}))))

  (find-table-row [driver table row]
    (let [row-css (str  "tr:nth-child(" (inc row) ")")
          complete-css (if (and (find-element-by table (by-tag "th"))
                                  (zero? row))
                           (str row-css " " "th")
                           (str row-css " " "td"))]
      ;; Element, not Driver, version of protocol
      (find-elements-by table (by-query {:css complete-css}))))

  ;; TODO: reconsider find-table-col with CSS support

  (find-by-hierarchy [driver hierarchy-vec]
    (find-elements driver {:xpath (build-query hierarchy-vec)}))

  (find-elements
    ([driver attr-val]
       (if (cache/cache-enabled? driver)
         ;; Deal with caching
         (if (cache/in-cache? driver attr-val)
           ;; Return from cache
           (cache/retrieve driver attr-val)
           ;; Find, then store, then return
           (let [els (find-elements* driver attr-val)]
             (if (and (not (nil? els))
                      (exists? (first els))
                      (cache/cacheable? driver attr-val))
               (do
                 (cache/insert driver attr-val els)
                 els)
               els)))
         ;; No caching logic
         (find-elements* driver attr-val))))

  (find-element
    ([driver attr-val]
       (if (cache/cache-enabled? driver)
         ;; Deal with cache logic
         (if (cache/in-cache? driver attr-val)
           ;; Return from cache
           (first (cache/retrieve driver attr-val))
           ;; Find, then store, then return
           (let [el (find-element* driver attr-val)]
             (if (and (not (nil? el))
                      (exists? el)
                      (cache/cacheable? driver attr-val))
               (do
                 (cache/insert driver attr-val el)
                 el)
               el)))
         ;; No cache logic
         (find-element* driver attr-val))))

  IActions

  (click-and-hold
    ([driver]
       (let [act (:actions driver)]
         (.perform (.clickAndHold act))))
    ([driver element]
       (let [act (:actions driver)]
         (.perform (.clickAndHold act (:webelement element))))))

  (double-click
    ([driver]
       (let [act (:actions driver)]
         (.perform (.doubleClick act))))
    ([driver element]
       (let [act (:actions driver)]
         (.perform (.doubleClick act (:webelement element))))))

  (drag-and-drop
    [driver element-a element-b]
    (cond
     (nil? element-a) (throw-nse "The first element does not exist.")
     (nil? element-b) (throw-nse "The second element does not exist.")
     :else (let [act (:actions driver)]
             (.perform (.dragAndDrop act
                                     (:webelement element-a)
                                     (:webelement element-b))))))

  (drag-and-drop-by
    [driver element x-y-map]
    (if (nil? element)
      (throw-nse)
      (let [act (:actions driver)
            {:keys [x y] :or {x 0 y 0}} x-y-map]
        (.perform
         (.dragAndDropBy act
                         (:webelement element)
                         x y)))))

  (key-down
    ([driver k]
       (let [act (:actions driver)]
         (.perform (.keyDown act (key-code k)))))
    ([driver element k]
       (let [act (:actions driver)]
         (.perform (.keyDown act (:webelement element) (key-code k))))))

  (key-up
    ([driver k]
       (let [act (:actions driver)]
         (.perform (.keyUp act (key-code k)))))
    ([driver element k]
       (let [act (:actions driver)]
         (.perform (.keyUp act (:webelement element) (key-code k))))))

  (move-by-offset
    [driver x y]
    (let [act (:actions driver)]
      (.perform (.moveByOffset act x y))))

  (move-to-element
    ([driver element]
       (let [act (:actions driver)]
         (.perform (.moveToElement act (:webelement element)))))
    ([driver element x y]
       (let [act (:actions driver)]
         (.perform (.moveToElement act (:webelement element) x y)))))

  (release
    ([driver]
       (let [act (:actions driver)]
         (.release act)))
    ([driver element]
       (let [act (:actions driver)]
         (.release act element)))))

(extend-type org.openqa.selenium.interactions.Actions

  IActions
  ;; TODO: test coverage
  (click-and-hold
    ([act]
       (.clickAndHold act))
    ([act element]
       (.clickAndHold act (:webelement element))))

  ;; TODO: test coverage
  (double-click
    ([act]
       (.doubleClick act))
    ([act element]
       (.doubleClick act (:webelement element))))

  ;; TODO: test coverage
  (drag-and-drop
    [act element-a element-b]
    (.dragAndDrop act (:webelement element-a) (:webelement element-b)))

  ;; TODO: test coverage
  (drag-and-drop-by
    [act element x y]
    (.dragAndDropBy act (:webelement element) x y))

  ;; TODO: test coverage
  (key-down
    ([act k]
       (.keyDown act (key-code k)))
    ([act element k]
       (.keyDown act (:webelement element) (key-code k))))

  ;; TODO: test coverage
  (key-up
    ([act k]
       (.keyUp act (key-code k)))
    ([act element k]
       (.keyUp act (:webelement element) (key-code k))))

  ;; TODO: test coverage
  (move-by-offset
    [act x y]
    (.moveByOffset act x y))

  ;; TODO: test coverage
  (move-to-element
    ([act element]
       (.moveToElement act (:webelement element)))
    ([act element x y]
       (.moveToElement act (:webelement element) x y)))

  ;; TODO: test coverage
  (perform [act] (.perform act))

  ;; TODO: test coverage
  (release
    ([act]
       (.release act))
    ([act element]
       (.release act (:webelement element)))))

(extend-type CompositeAction

  IActions
  (perform [comp-act] (.perform comp-act)))

(defn find-element* [driver attr-val]
  (first (find-elements driver attr-val)))

(defn find-elements* [driver attr-val]
  (when-not (and (or
                  (map? attr-val)
                  (vector? attr-val))
                 (empty? attr-val))
    (try
      (cond
        ;; Accept by-clauses
        (not (or (vector? attr-val)
                 (map? attr-val)))
        (find-elements-by driver attr-val)

        ;; Accept vectors for hierarchical queries
        (vector? attr-val)
        (find-by-hierarchy driver attr-val)

        ;; Build XPath dynamically
        :else
        (find-elements-by driver (by-query (build-query attr-val))))
      (catch org.openqa.selenium.NoSuchElementException e
        ;; NoSuchElementException caught here to mimic Clojure behavior like
        ;; (get {:foo "bar"} :baz) since the page can be thought of as a kind of associative
        ;; data structure with unique selectors as keys and HTML elements as values
        (lazy-seq nil)))))