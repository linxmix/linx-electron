const test = require('ava')

const flatten = require('./flatten')

test('flatten', (t) => {
  const mix = {
    id: 'one',
    channel: {
      id: 0,
      type: 'type0',
      channels: [{
        id: 1,
        type: 'type1',
        channels: [{
          id: 2,
          type: 'type2'
        }, {
          id: 3,
          type: 'type3',
          clips: [{
            id: 'beat',
            sampleId: 'beat.wav'
          }]
        }]
      }, {
        id: 4,
        type: 'type4',
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
        type: 'type0',
        channelIds: [1, 4],
        clipIds: []
      },
      1: {
        id: 1,
        type: 'type1',
        channelIds: [2, 3],
        clipIds: []
      },
      2: {
        id: 2,
        type: 'type2',
        channelIds: [],
        clipIds: []
      },
      3: {
        id: 3,
        type: 'type3',
        channelIds: [],
        clipIds: ['beat']
      },
      4: {
        id: 4,
        type: 'type4',
        channelIds: [],
        clipIds: []
      }
    },
    clips: {
      beat: {
        id: 'beat',
        sampleId: 'beat.wav'
      }
    }
  }

  const actual = flatten(mix)
  t.deepEqual(actual, expected)
})
