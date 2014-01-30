this.foo = this.foo + 1; // OK - outside of function.

function f() {
    this.foo = this.foo + 1; // OK - global |this|.
}

/**
 * @constructor
 */
function TypeOne() {
    this.foo = this.foo + 1; // OK - object field in ctor.

    /**
     * @this {TypeOne}
     */
    function callbackOne() {
        this.foo = this.foo + 1; // OK - @this declared.

        function badInnerCallback() {
            this.foo = this.foo + 2; // ERROR - @this not declared.
        }
    }

    function badCallbackInCtor() {
        this.foo = this.foo + 1; // ERROR - @this not declared.
    }
}

TypeOne.prototype = {
    addListener: function(callback)
    {
        if (typeof callback !== "function")
            throw "addListener: callback is not a function";
        if (this._listeners.length === 0)
            extensionServer.sendRequest({ command: commands.Subscribe, type: this._type });
        this._listeners.push(callback);
        extensionServer.registerHandler("notify-" + this._type, this._dispatch.bind(this));
    },

    funcOne: function() {
        this.foo = this.foo + 1; // OK - in method.
    },

    funcTwo: function() {
        /**
         * @this {TypeOne}
         */
        function callback() {
            this.foo = this.foo + 1; // OK - @this declared.
        }
    },

    funcThree: function() {
        function badCallbackInMethod() {
            this.foo = this.foo + 1; // ERROR - @this not declared.
        }
    }
}


/**
 * @constructor
 */
TypeTwo = function() {
    this.bar = this.bar + 1; // OK - object field in ctor.

    /**
     * @this {TypeTwo}
     */
    function callbackOne() {
        this.bar = this.bar + 1; // OK - @this declared.

        function badInnerCallback() {
            this.bar = this.bar + 2; // ERROR - @this not declared.
        }
    }

    function badCallbackInCtor() {
        this.bar = this.bar + 1; // ERROR - @this not declared.
    }
}

TypeTwo.prototype = {
    funcOne: function() {
        this.bar = this.bar + 1; // OK - in method.
    },

    funcTwo: function() {
        /**
         * @this {TypeTwo}
         */
        function callback() {
            this.bar = this.bar + 1; // OK - @this declared.
        }
    },

    funcThree: function() {
        function badCallbackInMethod() {
            this.bar = this.bar + 1; // ERROR - @this not declared.
        }
    }
}

/**
 * @return {!Object}
 */
function returnConstructedObject() {

/**
 * @constructor
 */
TypeThree = function() {
    this.bar = this.bar + 1; // OK - object field in ctor.

    /**
     * @this {TypeThree}
     */
    function callbackOne() {
        this.bar = this.bar + 1; // OK - @this declared.

        function badInnerCallback() {
            this.bar = this.bar + 2; // ERROR - @this not declared.
        }
    }

    function badCallbackInCtor() {
        this.bar = this.bar + 1; // ERROR - @this not declared.
    }
}

TypeThree.prototype = {
    funcOne: function() {
        this.bar = this.bar + 1; // OK - in method.
    },

    funcTwo: function() {
        /**
         * @this {TypeThree}
         */
        function callback() {
            this.bar = this.bar + 1; // OK - @this declared.
        }
    },

    funcThree: function() {
        function badCallbackInMethod() {
            this.bar = this.bar + 1; // ERROR - @this not declared.
        }
    }
}

return new TypeThree();
}

var object = {
    /**
     * @this {MyType}
     */
    value: function()
    {
        this.foo = 1; // OK - @this annotated.
    }
};

(function() {
    var object = {
        /**
         * @this {MyType}
         */
        value: function()
        {
            this.foo = 1; // OK - @this annotated.
        }
    };
})();
