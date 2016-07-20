const deepstream = require('deepstream.io-client-js')
const defaults = require('../pongDefaults')
const keyMap = require('../keyMap.js');
const IS_TOUCH_DEVICE = 'ontouchstart' in window
const FACTOR = defaults.tiltFactor;
const once = require('once-event-listener')
var gamepad = null
var player = window.location.hash.substr(1) || 1

class Gamepad {
  constructor() {
    this.oldValue = 999;
    this.record = null;
    this.buttons = document.querySelectorAll('.gamepad');
    this.buttons[0].addEventListener('touchstart mousedown', this.onButtonPress.bind(this));
    this.buttons[1].addEventListener('touchstart mousedown', this.onButtonPress.bind(this));
    this.buttons[0].addEventListener('mouseup touchend', this.onButtonRelease.bind(this));
    this.buttons[1].addEventListener('mouseup touchend', this.onButtonRelease.bind(this));
    this.indicator = document.querySelector('.indicator')
    once(document.querySelector('.start-stop'), 'click', this.startGameHandler.bind(this));
    if (IS_TOUCH_DEVICE && window.DeviceMotionEvent != null) {
      this.indicatorHeight = this.indicator.style.height
      window.addEventListener('devicemotion', this.listenOnMotion.bind(this), false);
      document.querySelector('.gamepad-container').style.display = 'none'
    } else {
      this.indicator.style.display = 'none'
      document.querySelector('button').style.display = ''
      document.body.addEventListener('keydown', this.onkeydown.bind(this))
      document.body.addEventListener('keyup', this.onkeyup.bind(this))
    }
  }

  onkeydown(e) {
    if (e.keyCode === keyMap.Q) {
      this.update('up')
    } else if (e.keyCode === keyMap.A) {
      this.update('down')
    }
  }

  onkeyup(e) {
    this.onButtonRelease()
  }

  startGameHandler(e) {
    const element = e.target
    ds.record.getRecord('status').whenReady(record => {
      record.set('player' + player + '.ready', true)
      element.textContent = 'stop'
      record.subscribe(data => {
        if (data.winner == null || data['player' + player + '.ready'] == false) {
          document.body.style.background = 'white'
        } else if ( data.winner == player) {
          debugger
          document.body.style.background = 'green'
        } else {
          document.body.style.background ='red'
        }
      })
    })
    once(document.querySelector('.start-stop'), 'click', this.stopGameHandler.bind(this));
  }

  stopGameHandler(e) {
    ds.record.getRecord('status').whenReady(record => {
      record.set('player' + player + '.ready', false)
      e.target.textContent = 'start'
    })
    once(document.querySelector('.start-stop'), 'click', this.startGameHandler.bind(this));
  }

  setRecord(record) {
    this.record = record;
  }

  listenOnMotion(e) {
    if (e.accelerationIncludingGravity.y == null) {
      return document.body.style.background ='red';
    }
    const landscapeOrientation = window.innerWidth / window.innerHeight > 1;
    const value = landscapeOrientation ? e.accelerationIncludingGravity.x : e.accelerationIncludingGravity.y;
    if (Math.abs(this.oldValue - value) <= defaults.accelerationThreshold) {
      return
    }
    this.oldValue = value;
    const percentage = 1 - ((value / 10) + 1) / 2;
    const HEIGHT = window.innerHeight
    const AMPLIFIED = HEIGHT * (1 + FACTOR)
    let margin = Math.round(percentage * AMPLIFIED - (HEIGHT * FACTOR/2) - (this.indicatorHeight))
    if (margin < 0) {
      margin = 0
    } else if (margin > window.innerHeight - this.indicatorHeight) {
      margin = window.innerHeight - this.indicatorHeight
    }
    this.indicator.style['margin-top'] = margin + 'px'
    if (value > 0) {
      this.update('down', percentage)
    } else {
      this.update('up', percentage)
    }
  }

  update(direction, position) {
    this.record.set('moving', true);
    if (position != null) {
      this.record.set('position', position);
    } else {
      this.record.set('direction', direction);
    }
  }

  onButtonPress(event) {
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
    this.update(direction)
  }

  onButtonRelease() {
    this.record.set('moving', false);
    this.record.set('direction', null);
  }
}

const DEEPSTREAM_HOST = process.env.DEEPSTREAM_HOST || 'localhost:6020'
const ds = deepstream(DEEPSTREAM_HOST).login({}, function() {
  startApp(ds)
})

window.beforeunload = function() {
  ds.record.getRecord('status').whenReady(record => {
    record.set('player' + player + '.ready', false);
  });
};

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
