const React = require('react')
const d3 = require('d3')
const { pick, get, map, without, includes } = require('lodash')

const MixArrangementLayout = require('./mix-arrangement-layout')
const PrimaryTrackChannel = require('./primary-track-channel')
const TransitionChannel = require('./transition-channel')
const TrackControl = require('./track-control')
const getCurrentBeat = require('../../audios/helpers/get-current-beat')
const { beatToTime } = require('../../lib/number-utils')

const { CONTROL_TYPE_GAIN } = require('../../clips/constants')

class MixArrangementDetail extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      editingBeatgrids: [],
      selectedControlType: CONTROL_TYPE_GAIN
    }
  }

  selectControlType (controlType) {
    this.setState({
      selectedControlType: controlType
    })
  }

  toggleEditBeatgrid (channel) {
    const { id, channels } = channel

    // TODO: make this more robust, maybe provide channel.primaryClip in getter?
    const sampleChannel = get(channels, '[0]')
    const sampleClip = get(sampleChannel || {}, 'clips[0]')

    if (includes(this.state.editingBeatgrids, id)) {
      this.setState({
        editingBeatgrids: without(this.state.editingBeatgrids, id)
      })
      this.props.clearGridMarkers({
        id: sampleClip.id
      })
    } else {
      const { mix, audioContext } = this.props
      const currentMixBeat = getCurrentBeat({
        playState: mix.playState,
        beatScale: mix.channel.beatScale,
        audioContext: audioContext
      })
      const currentClipBeat = currentMixBeat - channel.startBeat - sampleChannel.startBeat -
        sampleClip.startBeat
      const currentAudioTime = beatToTime(currentClipBeat, sampleClip.sample.meta.bpm) +
        sampleClip.audioStartTime

      this.setState({
        editingBeatgrids: [...this.state.editingBeatgrids, id]
      })
      this.props.calculateGridMarkers({
        id: sampleClip.id,
        startTime: currentAudioTime - 15,
        endTime: currentAudioTime + 15,
        bpm: sampleClip.sample.meta.bpm
      })
    }
  }

  _asyncUpdateAudioGraph () {
    // TODO: remove this hack
    // Make sure this.props.mix is updated from previous action
    window.setTimeout(() => this.props.updateAudioGraph({ channel: this.props.mix.channel }))
  }

  render () {
    const { mix, audioContext, height, rowHeight, fromTrack, toTrack, scaleX, translateX } = this.props
    const { selectedControlType } = this.state
    if (!(mix && mix.channel)) { return null }

    const layoutActions = pick(this.props, ['updateZoom', 'moveClip', 'moveTransitionChannel',
      'movePrimaryTrackChannel', 'resizeChannel', 'updateAudioGraph', 'seekToBeat', 'moveControlPoint'])

    const primaryTrackChannelActions = {
      createControlPoint: ({ sourceId, e, minBeat, maxBeat }) => {
        const { beat, value } = _getPosition({ e, scaleX, rowHeight })
        this.props.createControlPoint({
          sourceId, beat, value, minBeat, maxBeat
        })
        this._asyncUpdateAudioGraph()
      },

      deleteControlPoint: (...args) => {
        this.props.deleteControlPoint(...args)
        this._asyncUpdateAudioGraph()
      },

      createAutomationClipWithControlPoint: ({ channelId, e, minBeat, maxBeat }) => {
        const { beat, value } = _getPosition({ e, scaleX, rowHeight })
        this.props.createAutomationClipWithControlPoint({
          channelId, beat, value, minBeat, maxBeat, controlType: selectedControlType
        })
        this._asyncUpdateAudioGraph()
      },

      selectGridMarker: ({ channel, clip, marker }) => {
        this.props.selectGridMarker({ channel, clip, marker })
        this.props.clearGridMarkers({ id: clip.id })
        this._asyncUpdateAudioGraph()

        console.log('setState', this.state.editingBeatgrids, channel.id)

        this.setState({
          editingBeatgrids: without(this.state.editingBeatgrids, channel.id)
        })
      }
    }

    const { transition } = fromTrack
    const beatScale = get(mix, 'channel.beatScale')
    const trackControls = map([fromTrack, toTrack], (track) =>
      <TrackControl
        key={track.id + '_control'}
        title={track.meta.title}
        bpm={track.meta.bpm}
        isEditingBeatgrid={includes(this.state.editingBeatgrids, track.channel.id)}
        toggleEditBeatgrid={this.toggleEditBeatgrid.bind(this, track.channel)}
      />
    )
    console.log('mix-arrangement-detail', { fromTrack, toTrack, transition })

    const NORMAL_RESOLUTION = 5
    const ZOOM_RESOLUTION = 10
    const fromTrackSampleResolution = includes(this.state.editingBeatgrids, fromTrack.channel.id)
      ? ZOOM_RESOLUTION : NORMAL_RESOLUTION
    const toTrackSampleResolution = includes(this.state.editingBeatgrids, toTrack.channel.id)
      ? ZOOM_RESOLUTION : NORMAL_RESOLUTION

    return <MixArrangementLayout
      mix={mix}
      audioContext={audioContext}
      scaleX={scaleX}
      translateX={translateX}
      height={height}
      trackControls={trackControls}
      selectControlType={this.selectControlType.bind(this)}
      selectedControlType={selectedControlType}
      {...layoutActions}>

      <PrimaryTrackChannel
        key={fromTrack.id + '_channel'}
        channel={fromTrack.channel}
        beatScale={beatScale}
        translateY={0}
        scaleX={scaleX}
        canDrag={false}
        canDragTransition
        canDragAutomations
        showTransition
        showAutomationControlType={!includes(this.state.editingBeatgrids, fromTrack.channel.id) && selectedControlType}
        color={d3.interpolateCool(0.25)}
        sampleResolution={fromTrackSampleResolution}
        {...primaryTrackChannelActions}
      />

      <PrimaryTrackChannel
        key={toTrack.id + '_channel'}
        channel={toTrack.channel}
        beatScale={beatScale}
        translateY={rowHeight}
        scaleX={scaleX}
        canDrag
        canDragAutomations
        showAutomationControlType={!includes(this.state.editingBeatgrids, toTrack.channel.id) && selectedControlType}
        color={d3.interpolateCool(0.75)}
        sampleResolution={toTrackSampleResolution}
        {...primaryTrackChannelActions}
      />
    </MixArrangementLayout>
  }
}

MixArrangementDetail.defaultProps = {
  height: '100%',
  rowHeight: 100,
  scaleX: 1,
  translateX: 1
}

module.exports = MixArrangementDetail

function _getPosition ({ e, scaleX, rowHeight }) {
  const dim = e.target.getBoundingClientRect()
  const x = e.clientX - dim.left
  const y = e.clientY - dim.top

  return {
    beat: (x / scaleX),
    value: 1 - (y / rowHeight)
  }
}
