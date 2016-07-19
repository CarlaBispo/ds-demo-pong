const deepstream = require('deepstream.io-client-js')
const jQuery = require('jquery')
const defaults = require('../pongDefaults')
const keyMap = require('../keyMap.js');
const IS_TOUCH_DEVICE = 'ontouchstart' in window
const FACTOR = defaults.tiltFactor;

window.jQuery = jQuery // for debugging

var gamepad = null
var player = window.location.hash.substr(1) || 1

class Gamepad {
  constructor() {
    this._oldValue = 999;
    this._record = null;
    this._area = jQuery('.gamepad');
    this._area.on('touchstart mousedown', this._onButtonPress.bind(this));
    this._area.on('mouseup touchend', this._onBUttonRelease.bind(this));
    this.$indicator = jQuery('.indicator')
    jQuery('.start').one('click', this.startGameHandler.bind(this));
    if (IS_TOUCH_DEVICE && window.DeviceMotionEvent != null) {
      this.indicatorHeight = this.$indicator.height()
      window.addEventListener('devicemotion', this._listenOnMotion.bind(this), false);
      jQuery('.gamepad-container').hide();
    } else {
      this.$indicator.hide();
      jQuery('button').show();
      jQuery(document.body).keydown(this.onkeydown.bind(this))
      jQuery(document.body).keyup(this.onkeyup.bind(this))
    }
  }

  onkeydown(e) {
    if (e.keyCode === keyMap.Q) {
      this._update('up')
    } else if (e.keyCode === keyMap.A) {
      this._update('down')
    }
  }

  onkeyup(e) {
    this._onBUttonRelease()
  }

  startGameHandler(e) {
    ds.record.getRecord('status').whenReady(record => {
      record.set('player' + player + '.ready', true)
      e.target.textContent = 'stop'
      record.subscribe(data => {
        if (data.winner == null || data['player' + player + '.ready'] == false) {
          jQuery(document.body).css('background', 'white')
        } else if ( data.winner == player) {
          jQuery(document.body).css('background', 'green')
        } else {
          jQuery(document.body).css('background', 'red')
        }
      })
    })
    jQuery('.start').one('click', this.stopGameHandler.bind(this));
  }

  stopGameHandler(e) {
    ds.record.getRecord('status').whenReady(record => {
      record.set('player' + player + '.ready', false)
      e.target.textContent = 'start'
    })
    jQuery('.start').one('click', this.startGameHandler.bind(this));
  }

  setRecord(record) {
    this._record = record;
  }

  _listenOnMotion(e) {
    if (e.accelerationIncludingGravity.y == null) {
      jQuery(document.body).css('background', 'red');
      return
    }
    const landscapeOrientation = window.innerWidth / window.innerHeight > 1;
    const value = landscapeOrientation ? e.accelerationIncludingGravity.x : e.accelerationIncludingGravity.y;
    if (Math.abs(this._oldValue - value) <= 0.3) {
      return
    }
    this._oldValue = value;
    const percentage = 1 - ((value / 10) + 1) / 2;
    const HEIGHT = window.innerHeight
    const AMPLIFIED = HEIGHT * (1 + FACTOR)
    let margin = Math.round(percentage * AMPLIFIED - (HEIGHT * FACTOR/2) - (this.indicatorHeight))
    if (margin < 0) {
      margin = 0
    } else if (margin > window.innerHeight - this.indicatorHeight) {
      margin = window.innerHeight - this.indicatorHeight
    }
    this.$indicator.css('margin-top', margin + 'px')
    if (value > 0) {
      this._update('down', percentage)
    } else {
      this._update('up', percentage)
    }
  }

  _update(direction, position) {
    this._record.set('moving', true);
    if (position != null) {
      this._record.set('position', position);
    } else {
      this._record.set('direction', direction);
    }
  }

  _onButtonPress(event) {
    event.preventDefault()
    const target = event.target
    const up = target.classList.contains('gamepad-up')
    const down = target.classList.contains('gamepad-down')
    var direction
    if (up && !down) {
      direction = 'up'
    } else if (down && !up) {
      direction = 'down'
    } else {
      direction = null
    }
    this._update(direction)
  }

  _onBUttonRelease() {
    this._record.set('moving', false);
    this._record.set('direction', null);
  }
}

const DEEPSTREAM_HOST = process.env.DEEPSTREAM_HOST || 'localhost:6020'
const ds = deepstream(DEEPSTREAM_HOST).login({}, function() {
  startApp(ds)
})

jQuery(window).on('beforeunload', function(){
  ds.record.getRecord('status').whenReady(record => {
    record.set('player' + player + '.ready', false)
  })
});

function startApp(ds) {
  window.ds = ds
  gamepad = new Gamepad();
  joinGame(ds);
}

function joinGame() {
  const recordName = 'player/' + player;
  ds.record.getRecord(recordName).whenReady(record => {
    record.set({
      name: player,
      position: null,
      moving: false,
      direction: null,
    });
    gamepad.setRecord(record);
  });
}

