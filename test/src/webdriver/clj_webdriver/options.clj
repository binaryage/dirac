(ns clj-webdriver.options)

(defprotocol IOptions
  "Options interface, including cookie and timeout handling"
  (add-cookie [driver cookie-spec] "Add a new cookie to the browser session")
  (delete-cookie-named [driver cookie-name] "Delete a cookie given its name")
  (delete-cookie [driver cookie-spec] "Delete a cookie given a cookie instance")
  (delete-all-cookies [driver] "Delete all cookies defined in the current session")
  (cookies [driver] "Retrieve a set of cookies defined in the current session")
  (cookie-named [driver cookie-name] "Retrieve a cookie object given its name"))

