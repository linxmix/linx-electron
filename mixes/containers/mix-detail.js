const React = require('react')
const { connect } = require('react-redux')
const { Link } = require('react-router')
const { findIndex, pick, mapValues } = require('lodash')
const keymaster = require('keymaster')

const DetectDragModifierKeys = require('../../lib/detect-drag-modifier-keys')
const { getMixProps } = require('../getters')
const { saveMix, loadMix } = require('../actions')
const { updateMeta } = require('../../metas/actions')
const { updateZoom } = require('../../svgs/actions')
const { moveClip, moveControlPoint, createAutomationClipWithControlPoint,
  createControlPoint, deleteControlPoint } = require('../../clips/actions')
const { moveTransitionChannel, movePrimaryTrackChannel, resizeChannel } = require('../../channels/actions')
const { playPause, seekToBeat, updateAudioGraph } = require('../../audios/actions')
const MixArrangementDetail = require('../../svgs/components/mix-arrangement-detail')
const { PLAY_STATE_PLAYING } = require('../../audios/constants')

class MixDetailContainer extends React.Component {
  componentDidMount () {
    keymaster('space', () => this.props.playPause({ channel: this.props.mix.channel }))

    const { loadMix, mix } = this.props
    if (mix && !mix.channel.type) {
      loadMix(mix.id)
    }
  }

  componentWillUnmount () {
    keymaster.unbind('space')
  }

  render () {
    const { mix, audioContext, fromTrack, toTrack, error, zoom,
      sampleError, saveMix, playPause } = this.props
    if (!mix) { return null }

    const arrangementActions = mapValues(
      pick(this.props, ['seekToBeat', 'updateZoom', 'moveControlPoint', 'updateAudioGraph',
        'createControlPoint', 'deleteControlPoint', 'createAutomationClipWithControlPoint',
        'moveClip', 'moveTransitionChannel', 'movePrimaryTrackChannel', 'resizeChannel']),
      (fn) => (options) => fn({
        quantization: _getQuantization(this.props.dragModifierKeys),
        ...options
      })
    )

    const { playState, isSaving, isLoading, isDirty, channel } = mix
    const { status: masterChannelStatus } = channel

    return <div className='VerticalLayout VerticalLayout--fullHeight'>
      <header className='VerticalLayout-fixedSection'>
        <h3>
          {fromTrack && fromTrack.meta.title} - {toTrack && toTrack.meta.title}
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
          onClick={() => playPause({ channel })}>
          {playState.status === PLAY_STATE_PLAYING ? 'Pause Mix' : 'Play Mix'}
        </button>
      </header>

      <section className='VerticalLayout-flexSection VerticalLayout VerticalLayout--fullHeight'>
        <MixArrangementDetail
          mix={mix}
          audioContext={audioContext}
          scaleX={zoom.scaleX}
          translateX={zoom.translateX}
          fromTrack={fromTrack}
          toTrack={toTrack}
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
    const currentTrackId = ownProps.params.trackId
    const currentTrackIndex = findIndex(mix.tracks, { id: currentTrackId })
    const fromTrack = mix.tracks[currentTrackIndex]
    const toTrack = mix.tracks[currentTrackIndex + 1]

    const zoom = props.zooms[currentMixId] || {}

    return { ...props, mix, zoom, fromTrack, toTrack }
  },
  {
    saveMix,
    loadMix,
    updateMeta,
    playPause,
    seekToBeat,
    moveClip,
    moveControlPoint,
    createControlPoint,
    deleteControlPoint,
    createAutomationClipWithControlPoint,
    moveTransitionChannel,
    movePrimaryTrackChannel,
    resizeChannel,
    updateZoom,
    updateAudioGraph
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
