//=============================================================================
// PONG
//=============================================================================
const defaults = require('./pongDefaults.js');
const colors = require('./pongColors.js');
const images = require('./pongImages.js');
const ai = require('./pongAI.js');
const courtDigits = require('./pongDigits.js');

const TILT_FACTOR = defaults.tiltFactor;

var Game = require('./game.js'),
    Pong = {

        Defaults: defaults,

        Colors: colors,

        Images: images,

        Levels: ai,

        //-----------------------------------------------------------------------------

        initialize: function(runner, cfg) {
            Game.loadImages(Pong.Images, function(images) {
                this.cfg         = cfg;
                this.runner      = runner;
                this.width       = runner.width;
                this.height      = runner.height;
                this.images      = images;
                this.playing     = false;
                this.scores      = [0, 0];
                this.menu        = Object.construct(Pong.Menu,   this);
                this.court       = Object.construct(Pong.Court,  this);
                this.leftPaddle  = Object.construct(Pong.Paddle, this);
                this.rightPaddle = Object.construct(Pong.Paddle, this, true);
                this.ball        = Object.construct(Pong.Ball,   this);
                this.sounds      = Object.construct(Pong.Sounds, this);
                this.runner.start();
            }.bind(this));
        },

        startDemo:         function() { this.start(0); },
        startSinglePlayer: function() { this.start(1); },
        startDoublePlayer: function() { this.start(2); },

        start: function(numPlayers) {
            if (!this.playing) {
                this.scores = [0, 0];
                this.playing = true;
                this.leftPaddle.setAuto(numPlayers < 1, this.level(0));
                this.rightPaddle.setAuto(numPlayers < 2, this.level(1));
                this.ball.reset();
                this.runner.hideCursor();
            }
        },

        stop: function(ask) {
            if (this.playing) {
                if (!ask || this.runner.confirm('Abandon game in progress ?')) {
                    this.playing = false;
                    this.leftPaddle.setAuto(false);
                    this.rightPaddle.setAuto(false);
                    this.runner.showCursor();
                }
            }
        },

        level: function(playerNo) {
            return 8 + (this.scores[playerNo] - this.scores[playerNo ? 0 : 1]);
        },

        goal: function(playerNo) {
            this.sounds.goal();
            this.scores[playerNo] += 1;
            const lastGoal = this.scores[playerNo] == defaults.maxGoals
            this.runner.notifyGoal(playerNo, this.scores[playerNo], lastGoal);
            if (lastGoal) {
                this.menu.declareWinner(playerNo);
                this.stop();
            }
            else {
                this.ball.reset(playerNo);
                this.leftPaddle.setLevel(this.level(0));
                this.rightPaddle.setLevel(this.level(1));
            }
        },

        update: function(dt) {
            this.leftPaddle.update(dt, this.ball);
            this.rightPaddle.update(dt, this.ball);
            if (this.playing) {
                var dx = this.ball.dx;
                var dy = this.ball.dy;
                this.ball.update(dt, this.leftPaddle, this.rightPaddle);
                if (this.ball.dx < 0 && dx > 0)
                    this.sounds.ping();
                else if (this.ball.dx > 0 && dx < 0)
                    this.sounds.pong();
                else if (this.ball.dy * dy < 0)
                    this.sounds.wall();

                if (this.ball.left > this.width)
                    this.goal(0);
                else if (this.ball.right < 0)
                    this.goal(1);
            }
        },

        draw: function(ctx) {
            this.court.draw(ctx, this.scores[0], this.scores[1]);
            this.leftPaddle.draw(ctx);
            this.rightPaddle.draw(ctx);
            if (this.playing)
                this.ball.draw(ctx);
            else
                this.menu.draw(ctx);
        },

        updatePlayer: function(player, data) {
            if (player == 1) {
                this.updatePaddle(this.leftPaddle, data)
            } else if (player == 2) {
                this.updatePaddle(this.rightPaddle, data)
            }
        },

        updatePaddle: function(paddle, data) {
            const direction = data.direction
            if (!paddle.auto) {
                if (data.position != null) {
                  this.setPaddlePosition(paddle, data.position)
                } else if (direction === 'up') {
                    paddle.moveUp();
                } else if (direction === 'down') {
                    paddle.moveDown();
                } else if (direction === null) {
                    paddle.stopMovingUp()
                    paddle.stopMovingDown()
                }
            }
        },

        setPaddlePosition: function(paddle, percentage) {
            const height = defaults.height - defaults.paddleHeight - defaults.wallWidth
            const amplified = height * (1 + TILT_FACTOR)
            let absolute = Math.round((percentage * amplified) - height * (TILT_FACTOR / 2))
            if (absolute < defaults.wallWidth) {
                absolute = defaults.wallWidth
            } else if (absolute > height) {
                absolute = height
            }
            paddle.setpos(paddle.x, absolute)
        },

        onkeydown: function(keyCode) {
            switch(keyCode) {
            case Game.KEY.ZERO: this.startDemo();            break;
            case Game.KEY.ONE:  this.startSinglePlayer();    break;
            case Game.KEY.TWO:  this.startDoublePlayer();    break;
            case Game.KEY.ESC:  this.stop(true);             break;
            case Game.KEY.Q:    if (!this.leftPaddle.auto)  this.leftPaddle.moveUp();    break;
            case Game.KEY.A:    if (!this.leftPaddle.auto)  this.leftPaddle.moveDown();  break;
            case Game.KEY.P:    if (!this.rightPaddle.auto) this.rightPaddle.moveUp();   break;
            case Game.KEY.L:    if (!this.rightPaddle.auto) this.rightPaddle.moveDown(); break;
            }
        },

        onkeyup: function(keyCode) {
            switch(keyCode) {
            case Game.KEY.Q: if (!this.leftPaddle.auto)  this.leftPaddle.stopMovingUp();    break;
            case Game.KEY.A: if (!this.leftPaddle.auto)  this.leftPaddle.stopMovingDown();  break;
            case Game.KEY.P: if (!this.rightPaddle.auto) this.rightPaddle.stopMovingUp();   break;
            case Game.KEY.L: if (!this.rightPaddle.auto) this.rightPaddle.stopMovingDown(); break;
            }
        },

        showStats:       function(on) { this.cfg.stats = on; },
        showFootprints:  function(on) { this.cfg.footprints = on; this.ball.footprints = []; },
        showPredictions: function(on) { this.cfg.predictions = on; },
        enableSound:     function(on) { this.cfg.sound = on; },

        //=============================================================================
        // MENU
        //=============================================================================

        Menu: {

            initialize: function(pong) {
                var winner = pong.images["images/winner.png"];
                this.winner1 = { image: winner, x: (pong.width/2) - winner.width - pong.cfg.wallWidth, y: 6 * pong.cfg.wallWidth };
                this.winner2 = { image: winner, x: (pong.width/2)                + pong.cfg.wallWidth, y: 6 * pong.cfg.wallWidth };
            },

            declareWinner: function(playerNo) {
                this.winner = playerNo;
            },

            draw: function(ctx) {
                if (this.winner == 0)
                    ctx.drawImage(this.winner1.image, this.winner1.x, this.winner1.y);
                else if (this.winner == 1)
                    ctx.drawImage(this.winner2.image, this.winner2.x, this.winner2.y);
            }

        },

        //=============================================================================
        // SOUNDS
        //=============================================================================

        Sounds: {

            initialize: function(pong) {
                this.game      = pong;
                this.supported = Game.ua.hasAudio;
                if (this.supported) {
                    this.files = {
                        ping: Game.createAudio("sounds/ping.wav"),
                        pong: Game.createAudio("sounds/pong.wav"),
                        wall: Game.createAudio("sounds/wall.wav"),
                        goal: Game.createAudio("sounds/goal.wav")
                    };
                }
            },

            play: function(name) {
                if (this.supported && this.game.cfg.sound && this.files[name])
                    this.files[name].play();
            },

            ping: function() { this.play('ping'); },
            pong: function() { this.play('pong'); },
            wall: function() { this.play('wall'); },
            goal: function() { this.play('goal'); }

        },

        //=============================================================================
        // COURT
        //=============================================================================

        Court: {

            initialize: function(pong) {
                var w  = pong.width;
                var h  = pong.height;
                var ww = pong.cfg.wallWidth;

                this.ww    = ww;
                this.walls = [];
                this.walls.push({x: 0, y: 0,      width: w, height: ww});
                this.walls.push({x: 0, y: h - ww, width: w, height: ww});
                var nMax = (h / (ww*2));
                for(var n = 0 ; n < nMax ; n++) { // draw dashed halfway line
                    this.walls.push({x: (w / 2) - (ww / 2),
                                     y: (ww / 2) + (ww * 2 * n),
                                     width: ww, height: ww});
                }

                var sw = 3*ww;
                var sh = 4*ww;
                this.score1 = {x: 0.5 + (w/2) - 1.5*ww - sw, y: 2*ww, w: sw, h: sh};
                this.score2 = {x: 0.5 + (w/2) + 1.5*ww,      y: 2*ww, w: sw, h: sh};
            },

            draw: function(ctx, scorePlayer1, scorePlayer2) {
                var drawWall = function (wall) {
                    ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
                };

                ctx.fillStyle = Pong.Colors.walls;
                this.walls.forEach(drawWall);
                this.drawDigit(ctx, scorePlayer1, this.score1.x, this.score1.y, this.score1.w, this.score1.h);
                this.drawDigit(ctx, scorePlayer2, this.score2.x, this.score2.y, this.score2.w, this.score2.h);
            },

            drawDigit: function(ctx, n, x, y, w, h) {
                ctx.fillStyle = Pong.Colors.score;
                var dw = this.ww*4/5;
                var dh = this.ww*4/5;
                var blocks = Pong.Court.DIGITS[n];
                if (blocks[0])
                    ctx.fillRect(x, y, w, dh);
                if (blocks[1])
                    ctx.fillRect(x, y, dw, h/2);
                if (blocks[2])
                    ctx.fillRect(x+w-dw, y, dw, h/2);
                if (blocks[3])
                    ctx.fillRect(x, y + h/2 - dh/2, w, dh);
                if (blocks[4])
                    ctx.fillRect(x, y + h/2, dw, h/2);
                if (blocks[5])
                    ctx.fillRect(x+w-dw, y + h/2, dw, h/2);
                if (blocks[6])
                    ctx.fillRect(x, y+h-dh, w, dh);
            },

            DIGITS: courtDigits

        },

        //=============================================================================
        // PADDLE
        //=============================================================================

        Paddle: {

            initialize: function(pong, rhs) {
                this.pong   = pong;
                this.width  = pong.cfg.paddleWidth;
                this.height = pong.cfg.paddleHeight;
                this.minY   = pong.cfg.wallWidth;
                this.maxY   = pong.height - pong.cfg.wallWidth - this.height;
                this.speed  = (this.maxY - this.minY) / pong.cfg.paddleSpeed;
                this.setpos(rhs ? pong.width - this.width : 0, this.minY + (this.maxY - this.minY)/2);
                this.setdir(0);
            },

            setpos: function(x, y) {
                this.x      = x;
                this.y      = y;
                this.left   = this.x;
                this.right  = this.left + this.width;
                this.top    = this.y;
                this.bottom = this.y + this.height;
            },

            setdir: function(dy) {
                this.up   = (dy < 0 ? -dy : 0);
                this.down = (dy > 0 ?  dy : 0);
            },

            setAuto: function(on, level) {
                if (on && !this.auto) {
                    this.auto = true;
                    this.setLevel(level);
                }
                else if (!on && this.auto) {
                    this.auto = false;
                    this.setdir(0);
                }
            },

            setLevel: function(level) {
                if (this.auto)
                    this.level = Pong.Levels[level];
            },

            update: function(dt, ball) {
                if (this.auto)
                    this.ai(dt, ball);

                var amount = this.down - this.up;
                if (amount != 0) {
                    var y = this.y + (amount * dt * this.speed);
                    if (y < this.minY)
                        y = this.minY;
                    else if (y > this.maxY)
                        y = this.maxY;
                    this.setpos(this.x, y);
                }
            },

            ai: function(dt, ball) {
                if (((ball.x < this.left) && (ball.dx < 0)) ||
                    ((ball.x > this.right) && (ball.dx > 0))) {
                    this.stopMovingUp();
                    this.stopMovingDown();
                    return;
                }

                this.predict(ball, dt);

                if (this.prediction) {
                    if (this.prediction.y < (this.top + this.height/2 - 5)) {
                        this.stopMovingDown();
                        this.moveUp();
                    }
                    else if (this.prediction.y > (this.bottom - this.height/2 + 5)) {
                        this.stopMovingUp();
                        this.moveDown();
                    }
                    else {
                        this.stopMovingUp();
                        this.stopMovingDown();
                    }
                }
            },

            predict: function(ball, dt) {
                // only re-predict if the ball changed direction, or its been some amount of time since last prediction
                if (this.prediction &&
                    ((this.prediction.dx * ball.dx) > 0) &&
                    ((this.prediction.dy * ball.dy) > 0) &&
                    (this.prediction.since < this.level.aiReaction)) {
                    this.prediction.since += dt;
                    return;
                }

                var pt  = Pong.Helper.ballIntercept(ball, {left: this.left, right: this.right, top: -10000, bottom: 10000}, ball.dx * 10, ball.dy * 10);
                if (pt) {
                    var t = this.minY + ball.radius;
                    var b = this.maxY + this.height - ball.radius;

                    while ((pt.y < t) || (pt.y > b)) {
                        if (pt.y < t) {
                            pt.y = t + (t - pt.y);
                        }
                        else if (pt.y > b) {
                            pt.y = t + (b - t) - (pt.y - b);
                        }
                    }
                    this.prediction = pt;
                }
                else {
                    this.prediction = null;
                }

                if (this.prediction) {
                    this.prediction.since = 0;
                    this.prediction.dx = ball.dx;
                    this.prediction.dy = ball.dy;
                    this.prediction.radius = ball.radius;
                    this.prediction.exactX = this.prediction.x;
                    this.prediction.exactY = this.prediction.y;
                    var closeness = (ball.dx < 0 ? ball.x - this.right : this.left - ball.x) / this.pong.width;
                    var error = this.level.aiError * closeness;
                    this.prediction.y = this.prediction.y + Game.random(-error, error);
                }
            },

            draw: function(ctx) {
                ctx.fillStyle = Pong.Colors.walls;
                ctx.fillRect(this.x, this.y, this.width, this.height);
                if (this.prediction && this.pong.cfg.predictions) {
                    ctx.strokeStyle = Pong.Colors.predictionExact;
                    ctx.strokeRect(this.prediction.x - this.prediction.radius, this.prediction.exactY - this.prediction.radius, this.prediction.radius*2, this.prediction.radius*2);
                    ctx.strokeStyle = Pong.Colors.predictionGuess;
                    ctx.strokeRect(this.prediction.x - this.prediction.radius, this.prediction.y - this.prediction.radius, this.prediction.radius*2, this.prediction.radius*2);
                }
            },

            moveUp:         function() { this.up   = 1; },
            moveDown:       function() { this.down = 1; },
            stopMovingUp:   function() { this.up   = 0; },
            stopMovingDown: function() { this.down = 0; }

        },

        //=============================================================================
        // BALL
        //=============================================================================

        Ball: {

            initialize: function(pong) {
                this.pong    = pong;
                this.radius  = pong.cfg.ballRadius;
                this.minX    = this.radius;
                this.maxX    = pong.width - this.radius;
                this.minY    = pong.cfg.wallWidth + this.radius;
                this.maxY    = pong.height - pong.cfg.wallWidth - this.radius;
                this.speed   = (this.maxX - this.minX) / pong.cfg.ballSpeed;
                this.accel   = pong.cfg.ballAccel;
            },

            reset: function(playerNo) {
                this.footprints = [];
                this.setpos(playerNo == 1 ?   this.maxX : this.minX,  Game.random(this.minY, this.maxY));
                this.setdir(playerNo == 1 ? -this.speed : this.speed, this.speed);
            },

            setpos: function(x, y) {
                this.x      = x;
                this.y      = y;
                this.left   = this.x - this.radius;
                this.top    = this.y - this.radius;
                this.right  = this.x + this.radius;
                this.bottom = this.y + this.radius;
            },

            setdir: function(dx, dy) {
                this.dxChanged = ((this.dx < 0) != (dx < 0)); // did horizontal direction change
                this.dyChanged = ((this.dy < 0) != (dy < 0)); // did vertical direction change
                this.dx = dx;
                this.dy = dy;
            },

            footprint: function() {
                if (this.pong.cfg.footprints) {
                    if (!this.footprintCount || this.dxChanged || this.dyChanged) {
                        this.footprints.push({x: this.x, y: this.y});
                        if (this.footprints.length > 50)
                            this.footprints.shift();
                        this.footprintCount = 5;
                    }
                    else {
                        this.footprintCount--;
                    }
                }
            },

            update: function(dt, leftPaddle, rightPaddle) {

                var pos = Pong.Helper.accelerate(this.x, this.y, this.dx, this.dy, this.accel, dt);

                if ((pos.dy > 0) && (pos.y > this.maxY)) {
                    pos.y = this.maxY;
                    pos.dy = -pos.dy;
                }
                else if ((pos.dy < 0) && (pos.y < this.minY)) {
                    pos.y = this.minY;
                    pos.dy = -pos.dy;
                }

                var paddle = (pos.dx < 0) ? leftPaddle : rightPaddle;
                var pt     = Pong.Helper.ballIntercept(this, paddle, pos.nx, pos.ny);

                if (pt) {
                    switch(pt.d) {
                    case 'left':
                    case 'right':
                        pos.x = pt.x;
                        pos.dx = -pos.dx;
                        break;
                    case 'top':
                    case 'bottom':
                        pos.y = pt.y;
                        pos.dy = -pos.dy;
                        break;
                    }

                    // add/remove spin based on paddle direction
                    if (paddle.up)
                        pos.dy = pos.dy * (pos.dy < 0 ? 0.5 : 1.5);
                    else if (paddle.down)
                        pos.dy = pos.dy * (pos.dy > 0 ? 0.5 : 1.5);
                }

                this.setpos(pos.x,  pos.y);
                this.setdir(pos.dx, pos.dy);
                this.footprint();
            },

            draw: function(ctx) {
                var w = this.radius * 2;
                var h = this.radius * 2;
                var drawFootprint = function (footprint) {
                    ctx.strokeRect(footprint.x - this.radius, footprint.y - this.radius, w, h);
                }.bind(this);
                ctx.fillStyle = Pong.Colors.ball;
                ctx.fillRect(this.x - this.radius, this.y - this.radius, w, h);
                if (this.pong.cfg.footprints) {
                    ctx.strokeStyle = Pong.Colors.footprint;
                    this.footprints.forEach(drawFootprint);
                }
            }

        },

        //=============================================================================
        // HELPER
        //=============================================================================

        Helper: {

            accelerate: function(x, y, dx, dy, accel, dt) {
                var x2  = x + (dt * dx) + (accel * dt * dt * 0.5);
                var y2  = y + (dt * dy) + (accel * dt * dt * 0.5);
                var dx2 = dx + (accel * dt) * (dx > 0 ? 1 : -1);
                var dy2 = dy + (accel * dt) * (dy > 0 ? 1 : -1);
                return { nx: (x2-x), ny: (y2-y), x: x2, y: y2, dx: dx2, dy: dy2 };
            },

            intercept: function(x1, y1, x2, y2, x3, y3, x4, y4, d) {
                var denom = ((y4-y3) * (x2-x1)) - ((x4-x3) * (y2-y1));
                if (denom != 0) {
                    var ua = (((x4-x3) * (y1-y3)) - ((y4-y3) * (x1-x3))) / denom;
                    if ((ua >= 0) && (ua <= 1)) {
                        var ub = (((x2-x1) * (y1-y3)) - ((y2-y1) * (x1-x3))) / denom;
                        if ((ub >= 0) && (ub <= 1)) {
                            var x = x1 + (ua * (x2-x1));
                            var y = y1 + (ua * (y2-y1));
                            return { x: x, y: y, d: d};
                        }
                    }
                }
                return null;
            },

            ballIntercept: function(ball, rect, nx, ny) {
                var pt;
                if (nx < 0) {
                    pt = Pong.Helper.intercept(ball.x, ball.y, ball.x + nx, ball.y + ny,
                                               rect.right  + ball.radius,
                                               rect.top    - ball.radius,
                                               rect.right  + ball.radius,
                                               rect.bottom + ball.radius,
                                               "right");
                }
                else if (nx > 0) {
                    pt = Pong.Helper.intercept(ball.x, ball.y, ball.x + nx, ball.y + ny,
                                               rect.left   - ball.radius,
                                               rect.top    - ball.radius,
                                               rect.left   - ball.radius,
                                               rect.bottom + ball.radius,
                                               "left");
                }
                if (!pt) {
                    if (ny < 0) {
                        pt = Pong.Helper.intercept(ball.x, ball.y, ball.x + nx, ball.y + ny,
                                                   rect.left   - ball.radius,
                                                   rect.bottom + ball.radius,
                                                   rect.right  + ball.radius,
                                                   rect.bottom + ball.radius,
                                                   "bottom");
                    }
                    else if (ny > 0) {
                        pt = Pong.Helper.intercept(ball.x, ball.y, ball.x + nx, ball.y + ny,
                                                   rect.left   - ball.radius,
                                                   rect.top    - ball.radius,
                                                   rect.right  + ball.radius,
                                                   rect.top    - ball.radius,
                                                   "top");
                    }
                }
                return pt;
            }

        }

        //=============================================================================

    }; // Pong

module.exports = Pong;
