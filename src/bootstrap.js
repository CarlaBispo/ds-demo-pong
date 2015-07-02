//=============================================================================
//
// We need some ECMAScript 5 methods but we need to implement them ourselves
// for older browsers (compatibility: http://kangax.github.com/es5-compat-table/)
//
//  Function.bind:        https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/bind
//  Object.create:        http://javascript.crockford.com/prototypal.html
//  Object.extend:        (defacto standard like jquery $.extend or prototype's Object.extend)
//
//  Object.construct:     our own wrapper around Object.create that ALSO calls
//                        an initialize constructor method if one exists
//
//=============================================================================

if (!Function.prototype.bind) {
    Function.prototype.bind = function(obj) {
        var slice = [].slice,
            args  = slice.call(arguments, 1),
            self  = this,
            nop   = function () {},
            bound = function () {
                return self.apply(this instanceof nop ? this : (obj || {}), args.concat(slice.call(arguments)));
            };
        nop.prototype   = self.prototype;
        bound.prototype = new nop();
        return bound;
    };
}

if (!Object.create) {
    Object.create = function(base) {
        function F() {};
        F.prototype = base;
        return new F();
    };
}

if (!Object.construct) {
    Object.construct = function(base) {
        var instance = Object.create(base);
        if (instance.initialize)
            instance.initialize.apply(instance, [].slice.call(arguments, 1));
        return instance;
    };
}

if (!Object.extend) {
    Object.extend = function(destination, source) {
        for (var property in source) {
            if (source.hasOwnProperty(property))
                destination[property] = source[property];
        }
        return destination;
    };
}

/* NOT READY FOR PRIME TIME
 if (!window.requestAnimationFrame) {// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
 window.requestAnimationFrame = window.webkitRequestAnimationFrame ||
 window.mozRequestAnimationFrame    ||
 window.oRequestAnimationFrame      ||
 window.msRequestAnimationFrame     ||
 function(callback, element) {
 window.setTimeout(callback, 1000 / 60);
 }
 }
 */

//=============================================================================
// BOOTSTRAP
//=============================================================================
var Game = require('./game.js'),
    Pong = require('./pong.js');

    Game.ready(function() {

        var size        = document.getElementById('size');
        var sound       = document.getElementById('sound');
        var stats       = document.getElementById('stats');
        var footprints  = document.getElementById('footprints');
        var predictions = document.getElementById('predictions');

        var pong = Game.start('game', Pong, {
            sound:       sound.checked,
            stats:       stats.checked,
            footprints:  footprints.checked,
            predictions: predictions.checked
        });

        Game.addEvent(sound,       'change', function() { pong.enableSound(sound.checked);           });
        Game.addEvent(stats,       'change', function() { pong.showStats(stats.checked);             });
        Game.addEvent(footprints,  'change', function() { pong.showFootprints(footprints.checked);   });
        Game.addEvent(predictions, 'change', function() { pong.showPredictions(predictions.checked); });

    });
