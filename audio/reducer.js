const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { map, defaults, without, omit } = require('lodash')
const config = require('./config')
const createVirtualAudioGraph = require('virtual-audio-graph')

const {
  updateAudioGraph,
  updateVirtualAudioGraph
} = require('./actions')

module.exports = createReducer

function createReducer (config) {
  return handleActions({
    [updateAudioGraph]: (state, action) => {
      const channel = action.payload
      const audioGraph = createAudioGraph({ channel, state.audioContext })

      const nestedChannelEffects = map(channel.channels, nestedChannel =>
        Effects.constant(updateAudioGraph(nestedChannel)))

      return loop({
        ...state,
        audioGraphs: {
          ...state.audioGraphs,
          [channel.id]: audioGraph
        }
      }, Effects.batch([updateVirtualAudioGraph(channel.id)].concat(nestedChannelEffects)))
    },
    [updateVirtualAudioGraph]: (state, action) => {
      const channelId = action.payload
      const audioGraph = state.audioGraphs[channelId]
      if (!audioGraph) { return }

      const virtualAudioGraph = state.virtualAudioGraphs[channelId] || 


    }
  }, {
    audioGraphs: {},
    virtualAudioGraphs: {},
    masterChannels: {},
    audioContext: config.audioContext,
  })
}
