(ns clj-webdriver.remote.driver
  (:require clj-webdriver.driver)
  (:import clj_webdriver.driver.Driver
           [org.openqa.selenium.remote
            DesiredCapabilities
            RemoteWebDriver]))

(defprotocol IRemoteWebDriver
  "RemoteWebDriver-specific functionality"
  (command-executor [driver] "Get the CommandExecutor instance attached to this `driver`")
  (command-executor! [driver executor] "Set the CommandExecutor of the given `driver`")
  (session-id [driver] "Get the session id for the given `driver`")
  (session-id! [driver new-id] "Set the session id for the given `driver`"))

(extend-type Driver
  IRemoteWebDriver
  (capabilities [driver]
    (.getCapabilities (:webdriver driver)))
  
  (command-executor [driver]
    (.getCommandExecutor (:webdriver driver)))
  
  (command-executor! [driver executor]
    (.setCommandExecutor (:webdriver driver) executor))
  
  (session-id [driver]
    (str (.getSessionId (:webdriver driver))))
  
  (session-id! [driver new-id]
    (.setSessionId (:webdriver driver) new-id)))