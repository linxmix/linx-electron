const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const createVirtualAudioGraph = require('virtual-audio-graph')
const assert = require('assert')
const { merge } = require('lodash')

const { isValidNumber } = require ('../lib/number-utils');
const timeToBeat = require('./helpers/time-to-beat')
const beatToTime = require('./helpers/beat-to-time')
const { PLAY_STATE_PLAYING, PLAY_STATE_PAUSED } = require('./constants')

const {
  play,
  pause,
  updatePlayState,
  updateAudioGraph,
  updateVirtualAudioGraph
} = require('./actions')
const createAudioGraph = require('./helpers/create-audio-graph')

module.exports = createReducer

function createReducer (config) {
  return handleActions({
    [play]: (state, action) => {
      const { channel } = action.payload
      let { seekBeat } = action.payload
      const playState = state.playStates[channel.id]

      assert(!playState || (playState.status !== PLAY_STATE_PLAYING),
        'Cannot play channel that is already playing')

      if (!isValidNumber(seekBeat)) {
        if (playState) {
          seekBeat = playState.seakBeat
        } else {
          seekBeat = 0
        }
      }

      return loop(state, Effects.batch([
        Effects.constant(updatePlayState({
          channelId: channel.id,
          playState: {
            status: PLAY_STATE_PLAYING,
            absSeekTime: state.audioContext.currentTime,
            seekBeat,
          }
        })),
        Effects.constant(updateAudioGraph(channel)),
        Effects.constant(updateVirtualAudioGraph(channel.id)),
      ]))
    },
    [pause]: (state, action) => {
      const { channel, updateSeek = true } = action.payload
      const playState = state.playStates[channel.id]
      if (!playState) {
        console.warn('Attempted to pause channel without a playState')
        return
      }
      assert(playState.status !== PLAY_STATE_PAUSED,
        'Cannot pause channel that is already paused')

      let { absSeekTime, seekBeat } = playState
      if (updateSeek) {
        const currentTime = state.audioContext.currentTime
        seekBeat = timeToBeat(channel,
          beatToTime(channel, seekBeat) + currentTime - absSeekTime)
        absSeekTime = currentTime
      }

      return loop(state, Effects.batch([
        Effects.constant(updatePlayState({
          channelId: channel.id,
          playState: {
            status: PLAY_STATE_PAUSED,
            absSeekTime,
            seekBeat
          }
        })),
        Effects.constant(updateAudioGraph(channel)),
        Effects.constant(updateVirtualAudioGraph(channel.id)),
      ]))
    },
    [updatePlayState]: (state, action) => {
      const { channelId, playState } = action.payload

      return {
        ...state,
        playStates: {
          ...state.playStates,
          [channelId]: merge({}, state.playStates[channelId], playState)
        }
      }
    },
    [updateAudioGraph]: (state, action) => {
      const channel = action.payload
      const playState = state.playStates[channel.id]
      assert(channel.status === 'loaded', 'Requires loaded channel to updateAudioGraph')
      assert(!!playState, 'Requires playState to updateAudioGraph')

      const audioGraph = createAudioGraph({ channel, audioContext: state.audioContext, playState })

      return {
        ...state,
        audioGraphs: {
          ...state.audioGraphs,
          [channel.id]: audioGraph
        }
      }
    },
    [updateVirtualAudioGraph]: (state, action) => {
      const channelId = action.payload
      const audioGraph = state.audioGraphs[channelId]
      assert(!!audioGraph, 'Requires audioGraph to updateVirtualAudioGraph')

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
    playStates: {},
    audioContext: config.audioContext
  })
}
