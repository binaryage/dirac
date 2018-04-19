(ns dirac.shared.dom.shim
  (:refer-clojure :exclude [empty next parents remove val]))

; ---------------------------------------------------------------------------------------------------------------------------
; taken from light-table

(defn lazy-nl-via-item
  ([nl] (lazy-nl-via-item nl 0))
  ([nl n] (when (< n (. nl -length))
            (lazy-seq
              (cons (. nl (item n))
                    (lazy-nl-via-item nl (inc n)))))))

(extend-type js/HTMLCollection
  ISeqable
  (-seq [this] (lazy-nl-via-item this))

  ICounted
  (-count [this] (.-length this))

  IIndexed
  (-nth
    ([this n] (.item this n))
    ([this n not-found] (or (.item this n) not-found))))

(extend-type js/NodeList
  ISeqable
  (-seq [this] (lazy-nl-via-item this))

  ICounted
  (-count [this] (.-length this))

  IIndexed
  (-nth
    ([this n] (.item this n))
    ([this n not-found] (or (.item this n) not-found))))
