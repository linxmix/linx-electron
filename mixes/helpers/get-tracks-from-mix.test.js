// TODO
const test = require('ava')

const getTracksFromMix = require('./get-tracks-from-mix')

test('getTracksFromMix', (t) => {
  const flatMix = {
    id: 'one',
    channelId: 0,
    channels: {
      0: {
        id: 0,
        channelIds: [1, 4]
      },
      1: {
        id: 1,
        channelIds: [2, 3]
      },
      2: {
        id: 2
      },
      3: {
        id: 3,
        clipIds: ['beat']
      },
      4: {
        id: 4,
        channelIds: []
      }
    },
    clips: {
      beat: {
        id: 'beat',
        sampleId: 'beat.wav'
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
          channels: [],
          clips: []
        }, {
          id: 3,
          channels: [],
          clips: [{
            id: 'beat',
            sampleId: 'beat.wav'
          }]
        }],
        clips: []
      }, {
        id: 4,
        channels: [],
        clips: []
      }],
      clips: []
    }
  }

  const actual = nest(flatMix)
  t.deepEqual(actual, expected)
})
