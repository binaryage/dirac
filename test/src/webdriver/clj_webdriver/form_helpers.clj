;; ## Form Helpers ##
;;
;; The functions in this namespace are designed to make working with HTML forms
;; faster and more intuitive for "common" use-cases.
;;
(ns clj-webdriver.form-helpers
  (:use [clj-webdriver.core :only [input-text find-elements]])
  (:require clj-webdriver.driver)
  (:import clj_webdriver.driver.Driver
           org.openqa.selenium.WebDriver))

(defn- quick-fill*
  ([driver k v] (quick-fill* driver k v false))
  ([driver k v submit?]
     ;; shortcuts:
     ;; k as string => element's id attribute
     ;; v as string => text to input
     (let [query-map (if (string? k)
                       {:id k}
                       k)
           action (if (string? v)
                    #(input-text % v)
                    v)
           target-els (find-elements driver query-map)]
       (if submit?
         (doseq [el target-els]
           (action el))
         (apply action target-els)))))

(defprotocol IFormHelper
  "Useful functions for dealing with HTML forms"
  (quick-fill
    [driver query-action-maps]
    "`driver`              - browser driver
    `query-action-maps`   - a seq of maps of queries to actions (queries find HTML elements, actions are fn's that act on them)

    Note that a \"query\" that is just a String will be interpreted as the id attribute of your target element.
    Note that an \"action\" that is just a String will be interpreted as a call to `input-text` with that String for the target text field.

    Example usage:
    (quick-fill a-driver
      [{\"first_name\" \"Rich\"}
       {{:class \"foobar\"} click}])")
  (quick-fill-submit
    [driver query-action-maps]
    "Same as `quick-fill`, but expects that the final step in your sequence will submit the form, and therefore clj-webdriver will not return a value (since all page WebElement objects are lost in Selenium-WebDriver's cache after a new page loads)"))

(extend-type Driver
  IFormHelper
  (quick-fill
    [driver query-action-maps]
    (doseq [entries query-action-maps
            [k v] entries]
      (quick-fill* driver k v)))
  
  (quick-fill-submit
    [driver query-action-maps]
    (doseq [entries query-action-maps
            [k v] entries]
      (quick-fill* driver k v true))))