const test = require('ava')

const createAudioGraph = require('./create-audio-graph')

test('createAudioGraph', (t) => {
  const currentTime = 4

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
          sample: {
            audioBuffer: 'clip1AudioBuffer'
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
    'clip1Id': ['bufferSource', 'channel3Id', {
      buffer: 'clip1AudioBuffer',
      startTime: currentTime + 1,
      stopTime: currentTime + 100
    }]
  }

  const actual = createAudioGraph({
    channel: masterChannel,
    audioContext: { currentTime }
  })
  t.deepEqual(actual, expected)
})
