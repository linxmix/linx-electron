const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const createVirtualAudioGraph = require('virtual-audio-graph')
const assert = require('assert')
const { merge } = require('lodash')

const { isValidNumber } = require('../lib/number-utils')
const { PLAY_STATE_PLAYING, PLAY_STATE_PAUSED } = require('./constants')
const getCurrentBeat = require('./helpers/get-current-beat')

const {
  play,
  pause,
  playPause,
  seekToBeat,
  updatePlayState,
  updateAudioGraph,
  updateVirtualAudioGraph,
  updatePlayStateForTempoChange
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
          status: PLAY_STATE_PLAYING,
          absSeekTime: state.audioContext.currentTime,
          seekBeat
        })),
        Effects.constant(updateAudioGraph({ channel }))
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

      const { beatScale } = channel
      let { absSeekTime, seekBeat } = playState
      if (updateSeek) {
        const currentTime = state.audioContext.currentTime
        const elapsedTime = currentTime - absSeekTime
        seekBeat = beatScale.invert(beatScale(seekBeat) + elapsedTime)
        absSeekTime = currentTime
      }

      return loop(state, Effects.batch([
        Effects.constant(updatePlayState({
          channelId: channel.id,
          status: PLAY_STATE_PAUSED,
          absSeekTime,
          seekBeat
        })),
        Effects.constant(updateAudioGraph({ channel }))
      ]))
    },
    [playPause]: (state, action) => {
      const { channel } = action.payload
      const playState = state.playStates[channel.id]

      if (!playState || playState.status === PLAY_STATE_PAUSED) {
        return loop(state, Effects.constant(play(action.payload)))
      } else {
        return loop(state, Effects.constant(pause(action.payload)))
      }
    },
    [seekToBeat]: (state, action) => {
      const { channel, seekBeat } = action.payload
      const playState = state.playStates[channel.id] || {}

      return loop(state, Effects.batch([
        Effects.constant(updatePlayState({
          channelId: channel.id,
          seekBeat: seekBeat,
          absSeekTime: state.audioContext.currentTime
        })),
        playState.status === PLAY_STATE_PLAYING ?
          Effects.constant(updateAudioGraph({ channel })) :
          Effects.none()
      ]))
    },
    [updatePlayStateForTempoChange]: (state, action) => {
      const { channel, playState, beatScale } = action.payload

      return loop(state, Effects.constant(seekToBeat({
        channel,
        seekBeat: getCurrentBeat({ playState, beatScale, audioContext: state.audioContext })
      })))
    },
    [updatePlayState]: (state, action) => {
      const playState = action.payload
      const { channelId } = playState
      assert(!!channelId, 'Must provide channelId to updatePlayState')

      return {
        ...state,
        playStates: {
          ...state.playStates,
          [channelId]: merge({ status: PLAY_STATE_PAUSED }, state.playStates[channelId],
            playState)
        }
      }
    },

    // TODO: should this all be in channels reducer? so we dont have to pass full channel
    [updateAudioGraph]: (state, action) => {
      const { channel } = action.payload
      const playState = state.playStates[channel.id]
      assert(channel.status === 'loaded', 'Requires loaded channel to updateAudioGraph')

      if (!playState) { return }

      const audioGraph = createAudioGraph({
        channel,
        playState,
        beatScale: channel.beatScale,
        bpmScale: channel.bpmScale,
        audioContext: state.audioContext
      })

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
