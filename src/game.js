//=============================================================================
// GAME
//=============================================================================
const deepstream = require('deepstream.io-client-js');
const QRCode = require('qrcodejs2');
const utils = require('./utils')
const CONSTANTS = utils.getQueryStringAsObject()
const GAME_ID = CONSTANTS.gameId
const DEEPSTREAM_HOST = CONSTANTS.dsHost || process.env.DEEPSTREAM_HOST || window.location.hostname + ':6020'
const client = deepstream(DEEPSTREAM_HOST)
const keyMap = require('./keyMap.js');
const sniffer = require('./sniffer.js');


client.login({
    username: 'server'
}, (success) => {
    if (success) {
        if (window.location.search.indexOf('gameId') === -1) {
            const gameIdQueryString = 'gameId=' + client.getUid().split('-')[1]
            if (window.location.search === '') {
                return window.location.search = gameIdQueryString
            } else {
                return window.location.search += '&' + gameIdQueryString
            }
        }
        initializeQrCodes()
    } else {
        alert('Could not connect to deepstream server')
        console.error(arguments)
    }
});
window.dsClient = client; // for debugging


function initializeQrCodes() {
    const options = {
      width: 128,
      height: 128,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
    }
    const code1Element = document.getElementById("qrcode1")
    const code2Element = document.getElementById("qrcode2")
    code1Element.parentNode.href = `controls.html${window.location.search}#1`
    code2Element.parentNode.href = `controls.html${window.location.search}#2`

    new QRCode(code1Element, Object.assign({
      text: code1Element.parentNode.href
    }, options))
    new QRCode(code2Element, Object.assign({
      text: code2Element.parentNode.href
    }, options))
}

var Game = {

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

            const player1 = client.record.getRecord(GAME_ID + '-player/1')
            const player2 = client.record.getRecord(GAME_ID + '-player/2')
            player1.subscribe(data => {
                this.game.updatePlayer(1, data)
            })
            player2.subscribe(data => {
                this.game.updatePlayer(2, data)
            })

            this.statusRecord = client.record.getRecord(GAME_ID + '-status')
            this.statusRecord.subscribe('player1-online', online => {
              this.toggleChecked('.online-1', online)
              this.updateGameStatus(online, this.statusRecord.get('player2-online'))
            })
            this.statusRecord.subscribe('player2-online', online => {
              this.toggleChecked('.online-2', online)
              this.updateGameStatus(this.statusRecord.get('player1-online'), online)
            })
        },

        notifyGoal: function(playerNo, goals, lastGoal) {
            if (lastGoal) {
              this.statusRecord.set('player1-online', false)
              this.statusRecord.set('player2-online', false)
            }
            this.statusRecord.set(`player${playerNo+1}-goals`, {amount: goals, lastGoal: lastGoal})
        },

        updateGameStatus: function(player1, player2) {
          if (player1 && player2) {
            this.game.stop()
            this.game.startDoublePlayer()
          } else {
            this.game.stop()
          }
        },

        toggleChecked: function(selector, value) {
          const classList = document.querySelector(selector).classList
          value ? classList.add('checked') : classList.remove('checked')
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
