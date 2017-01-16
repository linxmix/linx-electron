const test = require('ava')

const nest = require('./nest')

test('nest', (t) => {
  const channels = {
    0: { 
      id: 0,
      type: 'type0',
      channelIds: [1, 4],
    },
    1: {
      id: 1,
      type: 'type1',
      channelIds: [2, 3]
    },
    2: {
      id: 2,
      type: 'type2'
    },
    3: {
      id: 3,
      type: 'type3',
      clipIds: ['beat']
    },
    4: {
      id: 4,
      type: 'type4',
      channelIds: []
    }
  }
  const clips = {
    beat: {
      id: 'beat',
      sampleId: 'beat.wav',
      isDirty: true
    }
  }
  const dirtyChannels = [4]

  const expected = {
    id: 0,
    type: 'type0',
    isDirty: true,
    channels: [{
      id: 1,
      type: 'type1',
      isDirty: true,
      channels: [{
        id: 2,
        type: 'type2',
        isDirty: false,
        channels: [],
        clips: []
      }, {
        id: 3,
        type: 'type3',
        isDirty: true,
        channels: [],
        clips: [{
          id: 'beat',
          sampleId: 'beat.wav',
          isDirty: true
        }]
      }],
      clips: []
    }, {
      id: 4,
      type: 'type4',
      isDirty: true,
      channels: [],
      clips: []
    }],
    clips: []
  }


  const actual = nest({ channelId: 0, channels, clips, dirtyChannels })
  t.deepEqual(actual, expected)
})
