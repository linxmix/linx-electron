const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const createVirtualAudioGraph = require('virtual-audio-graph')
const assert = require('assert')

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
      assert(channel.status === 'loaded', 'Requires loaded channel to updateAudioGraph')

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
    audioContext: config.audioContext
  })
}
