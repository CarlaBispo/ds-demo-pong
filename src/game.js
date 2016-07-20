//=============================================================================
// GAME
//=============================================================================
const deepstream = require('deepstream.io-client-js');
const DEEPSTREAM_HOST = process.env.DEEPSTREAM_HOST || 'localhost:6020'
const dsClient = deepstream(DEEPSTREAM_HOST).login({});
const keyMap = require('./keyMap.js');

window.dsClient = dsClient; // for debugging

var sniffer = require('./sniffer.js'),
    Game = {

    compatible: function() {
        return Object.create &&
            Object.extend &&
            Function.bind &&
            document.addEventListener && // HTML5 standard, all modern browsers that support canvas should also support add/removeEventListener
            Game.ua.hasCanvas;
    },

    start: function(id, game, cfg) {
        if (Game.compatible())
            return Object.construct(Game.Runner, id, game, cfg).game; // return the game instance, not the runner (caller can always get at the runner via game.runner)
    },

    ua: sniffer(),

    addEvent:    function(obj, type, fn) { obj.addEventListener(type, fn, false);    },
    removeEvent: function(obj, type, fn) { obj.removeEventListener(type, fn, false); },

    ready: function(fn) {
        if (Game.compatible())
            Game.addEvent(document, 'DOMContentLoaded', fn);
    },

    createCanvas: function() {
        return document.createElement('canvas');
    },

    createAudio: function(src) {
        try {
            var a = new Audio(src);
            a.volume = 0.1; // lets be real quiet please
            return a;
        } catch (e) {
            return null;
        }
    },

    loadImages: function(sources, callback) { /* load multiple images and callback when ALL have finished loading */
        var images = {};
        var count = sources ? sources.length : 0;
        var collectImages = function (source, index, sourcesArray) {
            let image = document.createElement('img');
            image.src = source;
            images[source] = image;
            Game.addEvent(image, 'load', function ifLastSource() { if (index === (sourcesArray.length - 1)) callback(images); });
        };

        if (count == 0) {
            callback(images);
        } else {
            sources.forEach(collectImages);
        }
    },

    random: function(min, max) {
        return (min + (Math.random() * (max - min)));
    },

    timestamp: function() {
        return new Date().getTime();
    },

    KEY: keyMap,

    //-----------------------------------------------------------------------------

    Runner: {

        initialize: function(id, game, cfg) {
            this.cfg          = Object.extend(game.Defaults || {}, cfg || {}); // use game defaults (if any) and extend with custom cfg (if any)
            this.fps          = this.cfg.fps || 60;
            this.interval     = 1000.0 / this.fps;
            this.canvas       = document.getElementById(id);
            this.width        = this.cfg.width  || this.canvas.offsetWidth;
            this.height       = this.cfg.height || this.canvas.offsetHeight;
            this.front        = this.canvas;
            this.front.width  = this.width;
            this.front.height = this.height;
            this.back         = Game.createCanvas();
            this.back.width   = this.width;
            this.back.height  = this.height;
            this.front2d      = this.front.getContext('2d');
            this.back2d       = this.back.getContext('2d');
            this.addEvents();
            this.resetStats();

            this.game = Object.construct(game, this, this.cfg); // finally construct the game object itself
        },

        start: function() { // game instance should call runner.start() when its finished initializing and is ready to start the game loop
            this.lastFrame = Game.timestamp();
            this.timer     = setInterval(this.loop.bind(this), this.interval);
        },

        stop: function() {
            clearInterval(this.timer);
        },

        loop: function() {
            var start  = Game.timestamp(); this.update((start - this.lastFrame)/1000.0); // send dt as seconds
            var middle = Game.timestamp(); this.draw();
            var end    = Game.timestamp();
            this.lastFrame = start;
        },

        update: function(dt) {
            this.game.update(dt);
        },

        draw: function() {
            this.back2d.clearRect(0, 0, this.width, this.height);
            this.game.draw(this.back2d);
            this.front2d.clearRect(0, 0, this.width, this.height);
            this.front2d.drawImage(this.back, 0, 0);
        },

        resetStats: function() {
            this.stats = {
                count:  0,
                fps:    0,
                update: 0,
                draw:   0,
                frame:  0  // update + draw
            };
        },

        updateStats: function(update, draw) {
            if (this.cfg.stats) {
                this.stats.update = Math.max(1, update);
                this.stats.draw   = Math.max(1, draw);
                this.stats.frame  = this.stats.update + this.stats.draw;
                this.stats.count  = this.stats.count == this.fps ? 0 : this.stats.count + 1;
                this.stats.fps    = Math.min(this.fps, 1000 / this.stats.frame);
            }
        },

        drawStats: function(ctx) {
            if (this.cfg.stats) {
                ctx.fillText("frame: "  + this.stats.count,         this.width - 100, this.height - 60);
                ctx.fillText("fps: "    + this.stats.fps,           this.width - 100, this.height - 50);
                ctx.fillText("update: " + this.stats.update + "ms", this.width - 100, this.height - 40);
                ctx.fillText("draw: "   + this.stats.draw   + "ms", this.width - 100, this.height - 30);
            }
        },

        addEvents: function() {
            Game.addEvent(document, 'keydown', this.onkeydown.bind(this));
            Game.addEvent(document, 'keyup',   this.onkeyup.bind(this));

            const player1 = dsClient.record.getRecord('player/1')
            const player2 = dsClient.record.getRecord('player/2')
            const status = dsClient.record.getRecord('status')
            player1.subscribe(data => {
                this.game.updatePlayer(1, data.direction, data.position)
            })
            player2.subscribe(data => {
                this.game.updatePlayer(2, data.direction, data.position)
            })
            status.subscribe(data => {
                // check for ready status
                if ((data.player1 || {}).ready) {
                    document.querySelector('.ready1').classList.add('checked')
                } else {
                    document.querySelector('.ready1').classList.remove('checked')
                }
                if ((data.player2 || {}).ready) {
                    document.querySelector('.ready2').classList.add('checked')
                } else {
                    document.querySelector('.ready2').classList.remove('checked')
                }

                // check for game start
                if ((data.player1 || {}).ready && (data.player2 || {}).ready) {
                    this.game.startDoublePlayer()
                } else if ((data.player1 || {}).ready) {
                    this.game.startSinglePlayer()
                    document.querySelector('.ready2').classList.add('checked')
                    document.querySelector('.ready2').textContent = 'AI'
                } else if ((data.player1 || {}).ready === false || (data.player2 || {}).ready === false) {
                    this.game.stop()
                    dsClient.record.getRecord('status').set('winner', null)
                    document.querySelector('.ready2').textContent = 'ready'
                    this.start()
                }
            })
        },

        notifyWinner: function(playerNo) {
            dsClient.record.getRecord('status').whenReady(status => {
                status.set('winner', playerNo)
            })
        },

        onkeydown: function(ev) { if (this.game.onkeydown) this.game.onkeydown(ev.keyCode); },
        onkeyup:   function(ev) { if (this.game.onkeyup)   this.game.onkeyup(ev.keyCode);   },

        hideCursor: function() { this.canvas.style.cursor = 'none'; },
        showCursor: function() { this.canvas.style.cursor = 'auto'; },

        alert: function(msg) {
            this.stop(); // alert blocks thread, so need to stop game loop in order to avoid sending huge dt values to next update
            var result = window.alert(msg);
            this.start();
            return result;
        },

        confirm: function(msg) {
            this.stop(); // alert blocks thread, so need to stop game loop in order to avoid sending huge dt values to next update
            var result = window.confirm(msg);
            this.start();
            return result;
        }

        //-------------------------------------------------------------------------

    } // Game.Runner
}; // Game

module.exports = Game;
