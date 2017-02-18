(ns clj-webdriver.cookie)

(defrecord Cookie [cookie name value path expiry domain secure?])

(defn new-cookie*
  ([name value] (org.openqa.selenium.Cookie. name value))
  ([name value path] (org.openqa.selenium.Cookie. name value path))
  ([name value path expiry] (org.openqa.selenium.Cookie. name value path expiry))
  ([name value domain path expiry] (org.openqa.selenium.Cookie. name value domain path expiry))
  ([name value domain path expiry secure?] (org.openqa.selenium.Cookie. name value domain path expiry secure?)))

(defn- nn
  [& sexprs]
  (not-any? nil? sexprs))

(defn init-cookie
  "Instantiate a Cookie record. Keys can be: `:name`, `:value`, `:domain`, `:path`, `:expiry`, or `:secure?`. The keys `:name` and `:value` are not optional."
  [{:keys [cookie name value domain path expiry secure?] :or {cookie nil domain nil path nil expiry nil secure? nil} :as cookie-spec}]
  {:pre [(or cookie
             (nn (:name cookie-spec) (:value cookie-spec)))]}
  (let [cookie-obj (cond
                     (nn cookie)                     cookie
                     (nn domain path expiry secure?) (new-cookie* name value domain path expiry secure?)
                     (nn domain path expiry)         (new-cookie* name value domain path expiry)
                     (nn path expiry)                (new-cookie* name value path expiry)
                     (nn path)                       (new-cookie* name value path)
                     :else                           (new-cookie* name value))
        {:keys [name value path domain expiry secure?]} (if cookie
                                                          {:name (.getName cookie)
                                                           :value (.getValue cookie)
                                                           :path (.getPath cookie)
                                                           :domain (.getDomain cookie)
                                                           :expiry (.getExpiry cookie)
                                                           :secure? (.isSecure cookie)}
                                                          {:name name
                                                           :value value
                                                           :path path
                                                           :domain domain
                                                           :expiry expiry
                                                           :secure? secure?})]
    (Cookie. cookie-obj name value path expiry domain secure?)))

