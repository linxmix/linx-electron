const test = require('ava')
const d3 = require('d3')

const createAudioGraph = require('./create-audio-graph')
const { PLAY_STATE_PLAYING } = require('../constants')
const { beatToTime } = require('../../lib/number-utils')

test('createAudioGraph', (t) => {
  const audioContext = { createSoundtouchSource: () => {} }
  const playState = {
    seekBeat: 0,
    absSeekTime: 20,
    status: PLAY_STATE_PLAYING
  }

  const bpm = 128
  const beatCount = 100
  const bpmScale = d3.scaleLinear()
    .domain([0, beatCount])
    .range([bpm, bpm])

  const beatScale = d3.scaleLinear()
    .domain([0, beatCount])
    .range([0, beatToTime(beatCount, bpm)])

  const masterChannel = {
    id: 'masterChannelId',
    type: 'type0',
    channels: [{
      id: 'channel1Id',
      type: 'type1',
      channels: [{
        id: 'channel2Id',
        type: 'type2'
      }, {
        id: 'channel3Id',
        type: 'type3',
        clips: [{
          id: 'clip1Id',
          sampleId: 'beat.wav',
          startBeat: 1,
          beatCount: 10,
          audioStartTime: 10,
          sample: {
            audioBuffer: 'clip1AudioBuffer',
            meta: {
              title: 'test audio file',
              bpm: 120
            }
          }
        }]
      }]
    }, {
      id: 'channel4Id',
      type: 'type4',
      channels: []
    }]
  }

  const expected = {
    'masterChannelId': ['channelMerger', 'output', { numberOfOutputs: 2 }],
    'channel1Id': ['channelMerger',
      { key: 'masterChannelId', outputs: [0], inputs: [0] },
      { numberOfOutputs: 2 }
    ],
    'channel2Id': ['channelMerger',
      { key: 'channel1Id', outputs: [0], inputs: [0] },
      { numberOfOutputs: 0 }
    ],
    'channel3Id': ['channelMerger',
      { key: 'channel1Id', outputs: [1], inputs: [0] },
      { numberOfOutputs: 0 }
    ],
    'channel4Id': ['channelMerger',
      { key: 'masterChannelId', outputs: [1], inputs: [0] },
      { numberOfOutputs: 0 }
    ],
    'clip1Id': ['soundtouchSource', 'channel3Id', {
      buffer: 'clip1AudioBuffer',
      startTime: playState.absSeekTime + 0.46875,
      stopTime: playState.absSeekTime + 5.15625,
      offsetTime: 10
    }]
  }

  const actual = createAudioGraph({
    channel: masterChannel,
    audioContext,
    playState,
    bpmScale,
    beatScale
  })
  t.truthy(actual.clip1Id[2].tempo instanceof Array)
  delete actual.clip1Id[2].tempo
  t.deepEqual(actual, expected)
})
