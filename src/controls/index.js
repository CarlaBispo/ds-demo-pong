const deepstream = require('deepstream.io-client-js')
const defaults = require('../pongDefaults')
const keyMap = require('../keyMap.js')
const utils = require('../utils')
const IS_TOUCH_DEVICE = 'ontouchstart' in window
const FACTOR = defaults.tiltFactor;
const GAME_ID = utils.getQueryStringAsObject().gameId

const DEEPSTREAM_HOST = process.env.DEEPSTREAM_HOST || window.location.hostname + ':6020'
const player = window.location.hash.substr(1) || 1
const otherPlayer = player == 1 ? 2 : 1

class Gamepad {
  constructor() {
    const buttons = document.querySelectorAll('.gamepad')
    this.initializeRecords()
     // accelerometer
    this.indicator = document.querySelector('.accelerometer-indicator')
    if (IS_TOUCH_DEVICE && window.DeviceMotionEvent != null) {
      this.indicatorHeight = this.indicator.style.height
      this.accelerationValue = 0
      window.addEventListener('devicemotion', this.listenOnMotion.bind(this), false);
      document.querySelector('.gamepad-container').style.display = 'none'
    } else {
      this.indicator.style.display = 'none'
      // up
      this.addEventListener(buttons[0], ['touchstart', 'mousedown'], this.onButtonPress)
      this.addEventListener(buttons[0], ['mouseup', 'touchend'], this.onButtonRelease)
      // down
      this.addEventListener(buttons[1], ['touchstart', 'mousedown'], this.onButtonPress)
      this.addEventListener(buttons[1], ['mouseup', 'touchend'], this.onButtonRelease)
      // key bindings
      this.addEventListener(document.body, ['keydown'], this.onkeydown)
      this.addEventListener(document.body, ['keyup'], this.onkeyup)
    }

    // online button
    this.joinButton = document.querySelector('.join-leave')
    this.addEventListener(this.joinButton, ['click'], this.startStopGameHandler)
  }

  initializeRecords(playerRecordName) {
    this.record = client.record.getRecord(GAME_ID + '-player/' + player)
    this.record.whenReady(record => {
      record.set({
        name: player,
        direction: null
      })
    })
    const statusRecord = client.record.getRecord(GAME_ID + '-status')
    statusRecord.subscribe(`player${player}-online`, online => {
      if (online === true) {
        document.body.style.background = '#ccc'
        this.joinButton.textContent = 'leave'
      } else {
        document.body.style.background = 'white'
        this.joinButton.textContent = 'join'
      }
    }, true)
    statusRecord.subscribe(`player${player}-goals`, data => {
      if ('vibrate' in navigator) {
        if (data.lastGoal) {
          navigator.vibrate([100, 300, 100, 300, 100])
          document.body.style.background = 'green'
        } else {
          navigator.vibrate(100)
        }
      }
    })
    statusRecord.subscribe(`player${otherPlayer}-goals`, data => {
      if (data.lastGoal) {
        document.body.style.background = 'red'
      }
    })
  }

  addEventListener(element, types, handler) {
    for (let i=0; i<types.length; i++) {
      element.addEventListener(types[i], handler.bind(this))
    }
  }

  listenOnMotion(e) {
    if (e.accelerationIncludingGravity.y == null) {
      return
    }
    const landscapeOrientation = window.innerWidth / window.innerHeight > 1;
    const value = landscapeOrientation ? e.accelerationIncludingGravity.x : e.accelerationIncludingGravity.y;

    if (Math.abs(this.accelerationValue - value) <= defaults.accelerationThreshold) {
      return
    }
    this.accelerationValue = value;
    const percentage = 1 - ((value / 10) + 1) / 2;
    const amplified = window.innerHeight * (1 + FACTOR)
    let margin = Math.round(percentage * amplified - (window.innerHeight * FACTOR/2) - (this.indicatorHeight))
    if (margin < 0) {
      margin = 0
    } else if (margin > window.innerHeight - this.indicatorHeight) {
      // TODO: this border doesn't work!
      margin = window.innerHeight - this.indicatorHeight
    }

    this.indicator.style['margin-top'] = margin + 'px'
    this.record.set('position', percentage);
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

  update(direction) {
    this.record.set('direction', direction)
  }

  onButtonRelease() {
    this.record.set('direction', null)
  }

  startStopGameHandler(e) {
    client.record.getRecord(GAME_ID + '-status').whenReady(statusRecord => {
      const oldValue = statusRecord.get(`player${player}-online`)
      statusRecord.set(`player${player}-online`, !oldValue)
      statusRecord.discard()
    })
  }
}

// ignore authentication
const client = deepstream(DEEPSTREAM_HOST).login({}, function(success) {
  window.dsClient = client
  if (success) {
    return new Gamepad()
  }
  alert('Could not connect to deepstream server')
  console.error(arguments)
})
