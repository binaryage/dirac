(ns dirac.runtime.preload)

(defn read-config []
  (if cljs.env/*compiler*
    (get-in @cljs.env/*compiler* [:options :external-config :dirac.runtime/config])))                                         ; https://github.com/bhauman/lein-figwheel/commit/80f7306bf5e6bd1330287a6f3cc259ff645d899b

(defmacro gen-config []
  (or (read-config) {}))
