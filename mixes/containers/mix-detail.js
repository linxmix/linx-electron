const React = require('react')
const { connect } = require('react-redux')
const { Link } = require('react-router')
const { assign, clone, find, pick, mapValues } = require('lodash')
const keymaster = require('keymaster')

const DetectDragModifierKeys = require('../../lib/detect-drag-modifier-keys')
const { getMixProps } = require('../getters')
const { saveMix, loadMix } = require('../actions')
const { updateZoom } = require('../../svgs/actions')
const { moveClip, resizeSampleClip, moveControlPoint, createAutomationClipWithControlPoint, createControlPoint, createSampleClip, snipClip,
  deleteControlPoint, calculateGridMarkers, clearGridMarkers, selectGridMarker, updateControlPointValue
} = require('../../clips/actions')
const { moveTrackGroup, resizeChannel, removeClipsFromChannel, createSampleTrackFromFile,
  updateChannel, moveChannel } = require('../../channels/actions')
const { playPause, seekToBeat, updateAudioGraph, toggleSoloChannel,
  updatePlayStateForTempoChange } = require('../../audios/actions')
const MixArrangementDetail = require('../../svgs/components/mix-arrangement-detail')
const { PLAY_STATE_PLAYING } = require('../../audios/constants')

class MixDetailContainer extends React.Component {
  componentDidMount () {
    keymaster('space', () => this.props.playPause({
      channel: this.props.mix.channel,
      updateSeek: false
    }))

    const { loadMix, mix } = this.props
    if (mix && !mix.channel.type) {
      loadMix(mix.id)
    }
  }

  componentWillUnmount () {
    keymaster.unbind('space')
  }

  render () {
    const { mix, audioContext, fromTrackGroup, toTrackGroup, error, zoom,
      sampleError, saveMix, playPause } = this.props
    if (!mix) { return null }

    const arrangementActions = mapValues(
      pick(this.props, ['seekToBeat', 'updateZoom', 'moveControlPoint', 'updateAudioGraph',
        'createControlPoint', 'deleteControlPoint', 'createAutomationClipWithControlPoint',
        'updateControlPointValue', 'moveClip', 'resizeSampleClip', 'moveTrackGroup', 'createSampleTrackFromFile', 'updateChannel', 'createSampleClip', 'moveChannel',   
        'resizeChannel', 'calculateGridMarkers', 'clearGridMarkers', 'selectGridMarker',
        'removeClipsFromChannel', 'toggleSoloChannel',
        'updatePlayStateForTempoChange', 'snipClip']),
      (fn) => (options) => fn({
        quantization: _getQuantization(this.props.dragModifierKeys),
        ...options
      })
    )

    // on drag sample clip:
    // drag track group if alt is held
    // drag track if shift is held
    // else drag clip
    arrangementActions.onDragSampleClip = ({
      id: clipId,
      startBeat: clipStartBeat,
      channel,
      ...options
    }) => {
      const modifierKeys = this.props.dragModifierKeys
      if (modifierKeys.shiftKey) {
        arrangementActions.moveChannel(assign({
          id: channel.id,
          startBeat: channel.startBeat
        }, options))
      } else if (modifierKeys.altKey) {
        const trackGroup = channel.parentChannel
        arrangementActions.moveTrackGroup(assign({
          trackGroup,
          moveFollowingChannels: true
        }, options))
      } else {
        arrangementActions.moveClip(assign({
          id: clipId,
          startBeat: clipStartBeat
        }, options))
      }
    }

    const { playState, isSaving, isLoading, isDirty, channel } = mix
    const { status: masterChannelStatus } = channel

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
          disabled={masterChannelStatus !== 'loaded'}
          onClick={() => playPause({ channel, updateSeek: false })}>
          {playState.status === PLAY_STATE_PLAYING ? 'Pause Mix' : 'Play Mix'}
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
    removeClipsFromChannel,
    calculateGridMarkers,
    clearGridMarkers,
    moveTrackGroup,
    resizeChannel,
    moveChannel,
    updateChannel,
    toggleSoloChannel,
    updateZoom,
    updateAudioGraph,
    updatePlayStateForTempoChange
  }
)(DetectDragModifierKeys({ listenForAllDragEvents: true })(MixDetailContainer))

// TODO use default quantization, provided by store state, unless modifier keys are present
function _getQuantization (modifierKeys, defaultQuantization = 'bar') {
  if (modifierKeys.ctrlKey || modifierKeys.metaKey) {
    return 'beat'
  } else if (modifierKeys.altKey) {
    return 'sample'
  } else {
    return defaultQuantization
  }
}
