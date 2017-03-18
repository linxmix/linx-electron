const test = require('ava')

const nest = require('./nest')
const { CHANNEL_TYPE_MIX } = require('../constants')

test('nest', (t) => {
  const channels = {
    0: {
      id: 0,
      startBeat: 0,
      type: CHANNEL_TYPE_MIX,
      channelIds: [1, 4, 5, 6]
    },
    1: {
      id: 1,
      startBeat: 1,
      type: 'type1',
      channelIds: [2, 3]
    },
    2: {
      id: 2,
      startBeat: 2,
      type: 'type2'
    },
    3: {
      id: 3,
      startBeat: 3,
      type: 'type3',
      clipIds: ['beat']
    },
    4: {
      id: 4,
      startBeat: 4,
      type: 'type4',
      channelIds: [],
      clipIds: []
    },
    5: {
      id: 5,
      startBeat: 5,
      type: 'type5',
      channelIds: [],
      clipIds: ['beat2']
    },
    6: {
      id: 6,
      startBeat: 6,
      type: 'type6',
      channelIds: [],
      clipIds: ['beat3']
    }
  }
  const clips = {
    beat: {
      id: 'beat',
      sampleId: 'beat.wav',
      isDirty: true,
      status: 'loading',
      beatCount: 1,
      startBeat: 0
    },
    beat2: {
      id: 'beat2',
      sampleId: 'beat2.wav',
      isDirty: false,
      status: 'loaded',
      beatCount: 2,
      startBeat: 1
    },
    beat3: {
      id: 'beat3',
      sampleId: 'beat3.wav',
      isDirty: true,
      status: 'unloaded',
      beatCount: 3,
      startBeat: 2
    }
  }
  const dirtyChannels = [4]

  const expected = {
    id: 0,
    startBeat: 0,
    beatCount: 11,
    type: CHANNEL_TYPE_MIX,
    status: 'loading',
    isDirty: true,
    channels: [{
      id: 1,
      startBeat: 1,
      beatCount: 4,
      type: 'type1',
      status: 'loading',
      isDirty: true,
      channels: [{
        id: 2,
        startBeat: 2,
        beatCount: 0,
        type: 'type2',
        status: 'loaded',
        isDirty: false,
        channels: [],
        clips: []
      }, {
        id: 3,
        startBeat: 3,
        beatCount: 1,
        type: 'type3',
        status: 'loading',
        isDirty: true,
        channels: [],
        clips: [{
          id: 'beat',
          sampleId: 'beat.wav',
          isDirty: true,
          status: 'loading',
          beatCount: 1,
          startBeat: 0
        }]
      }],
      clips: []
    }, {
      id: 4,
      startBeat: 4,
      beatCount: 0,
      type: 'type4',
      status: 'loaded',
      isDirty: true,
      channels: [],
      clips: []
    }, {
      id: 5,
      startBeat: 5,
      beatCount: 3,
      type: 'type5',
      status: 'loaded',
      isDirty: false,
      channels: [],
      clips: [{
        id: 'beat2',
        sampleId: 'beat2.wav',
        isDirty: false,
        status: 'loaded',
        beatCount: 2,
        startBeat: 1
      }]
    }, {
      id: 6,
      startBeat: 6,
      beatCount: 5,
      type: 'type6',
      status: 'unloaded',
      isDirty: true,
      channels: [],
      clips: [{
        id: 'beat3',
        sampleId: 'beat3.wav',
        isDirty: true,
        status: 'unloaded',
        beatCount: 3,
        startBeat: 2
      }]
    }],
    clips: []
  }

  const actual = nest({ channelId: 0, channels, clips, dirtyChannels })
  t.truthy(typeof actual.beatScale === 'function')
  t.truthy(typeof actual.bpmScale === 'function')
  delete actual.beatScale
  delete actual.bpmScale
  t.deepEqual(actual, expected)
})
