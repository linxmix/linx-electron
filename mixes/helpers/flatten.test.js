const test = require('ava')

const flatten = require('./flatten')

test('flatten', (t) => {
  const mix = {
    id: 'one',
    channel: {
      id: 0,
      channels: [{
        id: 1,
        channels: [{
          id: 2
        }, {
          id: 3
        }]
      }, {
        id: 4,
        channels: []
      }]
    }
  }

  const expected = {
    id: 'one',
    channelId: 0,
    channels: {
      0: {
        id: 0,
        channels: [1, 4]
      },
      1: {
        id: 1,
        channels: [2, 3]
      },
      2: {
        id: 2
      },
      3: {
        id: 3
      },
      4: {
        id: 4,
        channels: []
      }
    },
    clips: {}
  }
  const actual = flatten(mix)
  t.deepEqual(actual, expected)
})
