const test = require('ava')

const nest = require('./nest')

test('nest', (t) => {
  const flatMix = {
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
    }
  }

  const expected = {
    id: 'one',
    channel: {
      id: 0,
      channels: [{
        id: 1,
        channels: [{
          id: 2,
          channels: []
        }, {
          id: 3,
          channels: []
        }]
      }, {
        id: 4,
        channels: []
      }]
    }
  }

  const actual = nest(flatMix)
  t.deepEqual(actual, expected)
})
