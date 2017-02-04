const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { map, defaults, without, omit } = require('lodash')
const createVirtualAudioGraph = require('virtual-audio-graph')

const {
  updateAudioGraph,
  updateVirtualAudioGraph
} = require('./actions')
const createAudioGraph = require('./helpers/create-audio-graph')

module.exports = createReducer

function createReducer (config) {
  return handleActions({
    [updateAudioGraph]: (state, action) => {
      const channel = action.payload
      const audioGraph = createAudioGraph({ channel, audioContext: state.audioContext })

      return loop({
        ...state,
        audioGraphs: {
          ...state.audioGraphs,
          [channel.id]: audioGraph
        }
      }, Effects.constant(updateVirtualAudioGraph(channel.id)))
    },
    [updateVirtualAudioGraph]: (state, action) => {
      const channelId = action.payload
      const audioGraph = state.audioGraphs[channelId]
      if (!audioGraph) { return }

      const virtualAudioGraph = state.virtualAudioGraphs[channelId] || createVirtualAudioGraph({
        audioContext: state.audioContext,
        output: state.audioContext.destination
      })

      virtualAudioGraph.update(audioGraph)

      return {
        ...state,
        virtualAudioGraphs: {
          ...state.virtualAudioGraphs,
          [channelId]: virtualAudioGraph
        }
      }
    }
  }, {
    audioGraphs: {},
    virtualAudioGraphs: {},
    audioContext: config.audioContext,
  })
}
