/**
 * @constructor
 */
Base = function() {}

/**
 * @constructor
 * @extends {Base}
 */
DerivedNoProto = function() {}

/**
 * @constructor
 * @extends {Base}
 */
DerivedBadProto = function() {}

DerivedBadProto.prototype = {
    __proto__: Base
}

/**
 * @interface
 */
InterfaceWithProto = function() {}

InterfaceWithProto.prototype = {
    __proto__: Base.prototype
}

/**
 * @constructor
 */
ProtoNoExtends = function() {}

ProtoNoExtends.prototype = {
    __proto__: Base.prototype
}

/**
 * @constructor
 * @extends {Base}
 */
ProtoNotSameAsExtends = function() {}

ProtoNotSameAsExtends.prototype = {
    __proto__: Object.prototype
}

/**
 * @constructor
 * @extends {Base}
 */
ProtoNotObjectLiteral = function() {}

ProtoNotObjectLiteral.prototype = Object;

/**
 * @constructor
 * @extends {Base}
 */
DerivedNoSuperCall = function() {
}

DerivedNoSuperCall.prototype = {
    __proto__: Base.prototype
}

/**
 * @constructor
 * @extends {Base}
 */
DerivedBadSuperCall = function() {
    Base.call(1);
}

DerivedBadSuperCall.prototype = {
    __proto__: Base.prototype
}

/**
 * @extends {Base}
 */
GoodDerived = function() {
    Base.call(this);
}

GoodDerived.prototype = {
    __proto__: Base.prototype
}
