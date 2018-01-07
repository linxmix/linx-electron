const React = require('react')
const { connect } = require('react-redux')
const { Link } = require('react-router')
const { assign, clone, find, pick, mapValues } = require('lodash')
const keymaster = require('keymaster')

const DetectDragModifierKeys = require('../../lib/detect-drag-modifier-keys')
const { getMixProps } = require('../getters')
const { saveMix, loadMix } = require('../actions')
const { updateZoom } = require('../../svgs/actions')
const { loadReverbSampleList } = require('../../samples/actions')
const { updateMeta } = require('../../metas/actions')
const { moveClip, resizeSampleClip, moveControlPoint, createAutomationClipWithControlPoint, createControlPoint, createSampleClip, snipClip,
  deleteControlPoint, calculateGridMarkers, clearGridMarkers, selectGridMarker, updateControlPointValue
} = require('../../clips/actions')
const { moveTrackGroup, resizeChannel, removeClipsFromChannel, createSampleTrackFromFile,
  updateChannel, moveChannel, unsetChannel } = require('../../channels/actions')
const { playPause, seekToBeat, updateAudioGraph, toggleSoloChannel,
  startRecording, stopRecording } = require('../../audios/actions')
const MixArrangementDetail = require('../../svgs/components/mix-arrangement-detail')

class MixDetailContainer extends React.Component {
  componentDidMount () {
    keymaster('space', () => this.props.playPause({
      channel: this.props.mix.channel,
      updateSeek: false
    }))

    // keymaster('⌘+s, ctrl+s', () => this.props.mix.isDirty && this.props.saveMix(this.props.mix))

    const { loadMix, mix, loadReverbSampleList } = this.props
    if (mix && !mix.channel.type) {
      loadMix(mix.id)
    }
    loadReverbSampleList()
  }

  componentWillUnmount () {
    keymaster.unbind('space')
    // keymaster.unbind('⌘+s, ctrl+s')
  }

  handleToggleRecording () {
    const { mix, playPause, startRecording, stopRecording } = this.props
    const { playState, channel } = mix

    if (playState && playState.isRecording) {
      stopRecording({ channel })

      if (playState.isPlaying) {
        window.setTimeout(() => playPause({ channel, updateSeek: false }))
      }
    } else {
      startRecording({ channel })

      if (!(playState && playState.isPlaying)) {
        window.setTimeout(() => playPause({ channel, updateSeek: false }))
      }

      const duration = mix.channel.beatScale(mix.channel.maxBeat)
      window.setTimeout(() => {
        this.handleToggleRecording()
      }, duration * 1000)
    }
  }

  render () {
    const { mix, audioContext, fromTrackGroup, toTrackGroup, error, zoom,
      sampleError, saveMix, playPause, startRecording, stopRecording } = this.props
    if (!mix) { return null }

    const arrangementActions = mapValues(
      pick(this.props, ['seekToBeat', 'updateZoom', 'moveControlPoint', 'updateAudioGraph',
        'createControlPoint', 'deleteControlPoint', 'createAutomationClipWithControlPoint',
        'updateControlPointValue', 'moveClip', 'resizeSampleClip', 'moveTrackGroup', 'createSampleTrackFromFile', 'updateChannel', 'createSampleClip', 'moveChannel',   
        'resizeChannel', 'calculateGridMarkers', 'clearGridMarkers', 'selectGridMarker',
        'removeClipsFromChannel', 'toggleSoloChannel', 'updateMeta',
        'snipClip']),
      (fn) => (options) => fn({
        quantization: _getQuantization(this.props.dragModifierKeys),
        ...options
      })
    )

    // actions which dont need quantization
    arrangementActions.unsetChannel = this.props.unsetChannel
    arrangementActions.getQuantization = () => _getQuantization(this.props.dragModifierKeys)

    // on drop sample clip:
    // move track group if ctrl is held
    // move track if shift is held
    // else move clip
    arrangementActions.onDragSampleClip = ({
      id: clipId,
      startBeat: clipStartBeat,
      channel,
      ...options
    }) => {
      const modifierKeys = this.props.dragModifierKeys
      if (modifierKeys.ctrlKey) {
        const trackGroup = channel.parentChannel
        const absoluteClipStartBeat = mix.channel.startBeat + trackGroup.startBeat +
          channel.startBeat + clipStartBeat

        arrangementActions.moveTrackGroup(assign({
          trackGroup,
          moveTempoControlsFromBeat: absoluteClipStartBeat
        }, options))
      } else if (modifierKeys.shiftKey) {
        arrangementActions.moveChannel(assign({
          id: channel.id,
          startBeat: channel.startBeat
        }, options))
      } else {
        arrangementActions.moveClip(assign({
          id: clipId,
          startBeat: clipStartBeat
        }, options))
      }
    }

    const { playState, isSaving, isLoading, isDirty, channel } = mix

    return <div className='VerticalLayout VerticalLayout--fullHeight'>
      <header className='VerticalLayout-fixedSection'>
        <h3>
          {fromTrackGroup && fromTrackGroup.primaryTrack.sample.meta.title} - {toTrackGroup && toTrackGroup.primaryTrack.sample.meta.title}
        </h3>
        <Link to={`/mixes/${mix.id}`}>
          Back to Mix
        </Link>
        <div>{error || sampleError || 'no errors'}</div>
        <button disabled={!isDirty || (isLoading || isSaving)} onClick={() => saveMix(mix)}>
          Save Mix
        </button>
        <button
          disabled={isLoading || isSaving}
          onClick={() => playPause({ channel, updateSeek: false })}>
          {playState.isPlaying ? 'Pause Mix' : 'Play Mix'}
        </button>
        <button
          disabled={isLoading || isSaving}
          onClick={this.handleToggleRecording.bind(this)}>
          {playState.isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </header>

      <section className='VerticalLayout-flexSection VerticalLayout VerticalLayout--fullHeight'>
        <MixArrangementDetail
          mix={mix}
          audioContext={audioContext}
          scaleX={zoom.scaleX}
          translateX={zoom.translateX}
          fromTrackGroup={fromTrackGroup}
          toTrackGroup={toTrackGroup}
          {...arrangementActions}
        />
      </section>
    </div>
  }
}

module.exports = connect(
  (state, ownProps) => {
    const props = getMixProps(state)

    const currentMixId = ownProps.params.mixId
    const mix = props.mixes[currentMixId]

    const fromTrackGroupId = ownProps.params.fromTrackGroupId
    const toTrackGroupId = ownProps.params.toTrackGroupId
    const fromTrackGroup = find(mix.trackGroups, { id: fromTrackGroupId })
    const toTrackGroup = find(mix.trackGroups, { id: toTrackGroupId })

    const zoom = props.zooms[currentMixId] || {}

    return { ...props, mix, zoom, fromTrackGroup, toTrackGroup }
  },
  {
    saveMix,
    loadMix,
    playPause,
    seekToBeat,
    selectGridMarker,
    moveClip,
    resizeSampleClip,
    moveControlPoint,
    createControlPoint,
    deleteControlPoint,
    updateControlPointValue,
    createAutomationClipWithControlPoint,
    createSampleTrackFromFile,
    createSampleClip,
    snipClip,
    loadReverbSampleList,
    removeClipsFromChannel,
    calculateGridMarkers,
    clearGridMarkers,
    moveTrackGroup,
    resizeChannel,
    moveChannel,
    updateChannel,
    toggleSoloChannel,
    updateZoom,
    startRecording,
    stopRecording,
    unsetChannel,
    updateAudioGraph,
    updateMeta
  }
)(DetectDragModifierKeys({ listenForAllDragEvents: true })(MixDetailContainer))

// TODO use default quantization, provided by store state, unless modifier keys are present
function _getQuantization (modifierKeys, defaultQuantization = 'bar') {
  if (modifierKeys.metaKey) {
    return 'beat'
  } else if (modifierKeys.altKey) {
    return 'sample'
  } else {
    return defaultQuantization
  }
}
