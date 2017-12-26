const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const createVirtualAudioGraph = require('virtual-audio-graph')
const assert = require('assert')
const { merge } = require('lodash')
const Recorder = require('recorderjs')

const { isValidNumber } = require('../lib/number-utils')
const { PLAY_STATE_PLAYING, PLAY_STATE_PAUSED } = require('./constants')
const getCurrentBeat = require('./helpers/get-current-beat')

const {
  play,
  pause,
  playPause,
  startRecording,
  stopRecording,
  exportWav,
  exportWavSuccess,
  exportWavFailure,
  seekToBeat,
  toggleSoloChannel,
  updatePlayState,
  updateAudioGraph
} = require('./actions')
const createService = require('./service')
const createAudioGraph = require('./helpers/create-audio-graph')

module.exports = createReducer

function createReducer (config) {
  const service = createService(config)

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
      const { channel, updateSeek } = action.payload
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
    [toggleSoloChannel]: (state, action) => {
      const { soloChannelId, channel } = action.payload
      const playState = state.playStates[channel.id] || {}

      const newSoloChannelId = playState.soloChannelId && (playState.soloChannelId === soloChannelId) ?
        null : soloChannelId

      return loop(state, Effects.batch([
        Effects.constant(updatePlayState({
          channelId: channel.id,
          soloChannelId: newSoloChannelId
        })),
        playState.status === PLAY_STATE_PLAYING ?
          Effects.constant(updateAudioGraph({ channel })) :
          Effects.none()
      ]))
    },
    [updatePlayState]: (state, action) => {
      const playState = action.payload
      const { channelId } = playState
      assert(!!channelId, 'Must provide channelId to updatePlayState')

      return {
        ...state,
        playStates: {
          ...state.playStates,
          [channelId]: merge({
            status: PLAY_STATE_PAUSED,
            isRecording: false,
            recorderNode: null,
            seekBeat: 0,
            absSeekTime: 0
          }, state.playStates[channelId], playState)
        }
      }
    },
    [startRecording]: (state, action) => {
      const { channel } = action.payload
      const { id } = channel.id
      const virtualAudioGraph = state.virtualAudioGraphs[channel.id]

      if (!virtualAudioGraph) {
        return loop(state, Effects.batch([
          Effects.constant(updateAudioGraph({ channel })),
          Effects.constant(startRecording({ channel }))
        ]))
      } else {
        const recorderNode = new Recorder(virtualAudioGraph.getAudioNodeById(channel.id))
        recorderNode.record()

        return loop(state, Effects.constant(updatePlayState({
          channelId: channel.id,
          isRecording: true,
          recorderNode,
        })))
      }
    },
    [stopRecording]: (state, action) => {
      const { channel } = action.payload
      const playState = state.playStates[channel.id]
      const recorderNode = playState && playState.recorderNode
      assert(playState && recorderNode, 'Requires playState and recorderNode to stopRecording')

      recorderNode.stop()

      return loop(state, Effects.batch([
        Effects.constant(updatePlayState({
          channelId: channel.id,
          isRecording: false,
          recorderNode: null
        })),
        Effects.constant(exportWav({ recorderNode }))
      ]))
    },
    [exportWav]: (state, action) => {
      const { fileName, recorderNode } = action.payload
      assert(recorderNode, 'Requires recorderNode to exportWav')

      return loop(state, Effects.promise(runExportWav, { fileName, recorderNode }))
    },
    [exportWavSuccess]: (state, action) => {
      return state
    },
    [exportWavFailure]: (state, action) => {
      return state
    },
    [updateAudioGraph]: (state, action) => {
      const { channel } = action.payload
      assert(channel.status === 'loaded', 'Requires loaded channel to updateAudioGraph')

      const audioGraph = createAudioGraph({
        channel,
        playState: _getPlayStateOrDefault(state, channel.id),
        beatScale: channel.beatScale,
        bpmScale: channel.bpmScale,
        audioContext: state.audioContext
      })

      const virtualAudioGraph = state.virtualAudioGraphs[channel.id] || createVirtualAudioGraph({
        audioContext: state.audioContext,
        output: state.audioContext.destination
      })
      virtualAudioGraph.update(audioGraph)

      return {
        ...state,
        audioGraphs: {
          ...state.audioGraphs,
          [channel.id]: audioGraph
        },
        virtualAudioGraphs: {
          ...state.virtualAudioGraphs,
          [channel.id]: virtualAudioGraph
        }
      }
    },
  }, {
    audioGraphs: {},
    virtualAudioGraphs: {},
    playStates: {},
    audioContext: config.audioContext
  })

  function runExportWav ({ fileName, recorderNode }) {
    return service.exportWav({ fileName, recorderNode })
      .then(exportWavSuccess)
      .catch(exportWavFailure)
  }
}

function _getPlayStateOrDefault(state, channelId) {
  return state.playStates[channelId] || {
    status: PLAY_STATE_PAUSED,
    isRecording: false,
    recorderNode: null,
    seekBeat: 0,
    absSeekTime: 0
  }
}
