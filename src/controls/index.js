const deepstream = require('deepstream.io-client-js')
const once = require('once-event-listener')
const DEEPSTREAM_HOST = process.env.DEEPSTREAM_HOST || 'localhost:6020'

const player = window.location.hash.substr(1) || 1

class Gamepad {
  constructor() {
    const buttons = document.querySelectorAll('.gamepad')
    this.initializeRecords('player/' + player)
    // up
    this.addEventListener(buttons[0], ['touchstart', 'mousedown'], this.onButtonPress)
    this.addEventListener(buttons[0], ['mouseup', 'touchend'], this.onButtonRelease)
    // down
    this.addEventListener(buttons[1], ['touchstart', 'mousedown'], this.onButtonPress)
    this.addEventListener(buttons[1], ['mouseup', 'touchend'], this.onButtonRelease)
    // online button
    this.joinButton = document.querySelector('.join-leave')
    this.addEventListener(this.joinButton, ['click'], this.startStopGameHandler)

  }

  addEventListener(element, types, handler) {
    for (let i=0; i<types.length; i++) {
      const type = types[i]
      element.addEventListener(type, handler.bind(this))
    }
  }

  initializeRecords(playerRecordName) {
    // initialize player record
    this.record = ds.record.getRecord(playerRecordName)
    this.record.whenReady(record => {
      record.set({
        name: player,
        direction: null
      })
    })
    const statusRecord = ds.record.getRecord('status')
    statusRecord.subscribe(`player${player}-online`, online => {
      if (online === true) {
        document.body.style.background ='#ccc'
        this.joinButton.textContent = 'leave'
      } else {
        document.body.style.background ='white'
        this.joinButton.textContent = 'join'
      }
    }, true)
    statusRecord.subscribe(`player${player}-goals`, data => {
      if ('vibrate' in navigator) {
        if (data.lastGoal) {
          navigator.vibrate([100, 300, 100, 300, 100])
        } else {
          navigator.vibrate(100)
        }
      }
    })
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

  update(direction, position) {
    this.record.set('direction', direction)
  }

  onButtonRelease() {
    this.record.set('direction', null)
  }

  startStopGameHandler(e) {
    ds.record.getRecord('status').whenReady(statusRecord => {
      const oldValue = statusRecord.get(`player${player}-online`)
      statusRecord.set(`player${player}-online`, !oldValue)
    })
  }
}

// ignore authentication
const ds = deepstream(DEEPSTREAM_HOST).login({}, function(success) {
  window.ds = ds
  if (success) {
    return new Gamepad()
  }
  console.error('Could not connect to deepstream server')
})
