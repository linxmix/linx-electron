const React = require('react')
const d3 = require('d3')
const { find, forEach, pick, get, map, without, includes } = require('lodash')

const MixArrangementLayout = require('./mix-arrangement-layout')
const TrackGroup = require('./track-group')
const TrackControl = require('./track-control')
const TempoClip = require('./tempo-clip')
const getCurrentBeat = require('../../audios/helpers/get-current-beat')
const { beatToTime } = require('../../lib/number-utils')

const { CONTROL_TYPE_GAIN, CLIP_TYPE_SAMPLE } = require('../../clips/constants')
const { CHANNEL_TYPE_SAMPLE_TRACK, CHANNEL_TYPE_PRIMARY_TRACK } = require('../../channels/constants')

const ZOOM_RESOLUTION = 10
const NORMAL_RESOLUTION = 5

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

  handleFilesDrop ({ files }) {
    const { fromTrackGroup, createSampleTrackFromFile } = this.props

    forEach(files, (file, i) => createSampleTrackFromFile({
      file,
      parentChannelId: fromTrackGroup.id,
      attrs: {
        startBeat: i
      }
    }))
  }

  toggleEditBeatgrid (trackGroup) {
    const { id } = trackGroup

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

      // hack: guess we're talking about a single clip in primary track channel
      // TODO: fix this, primary track channel may have many clips. maybe needs a util
      //       eg clipsAtTime(playTime, mix.channels)
      const primaryTrackChannel = find(trackGroup.channels, { type: CHANNEL_TYPE_PRIMARY_TRACK })
      const sampleClip = find(primaryTrackChannel.clips, { type: CLIP_TYPE_SAMPLE })
      const currentClipBeat = currentMixBeat - trackGroup.startBeat - primaryTrackChannel.startBeat -
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

  _wrapWithAsyncUpdatePlayState (func) {
    return (...args) => {
      func(...args)
      
      // TODO: remove this hack
      // Make sure this.props.mix is updated from previous action
      window.setTimeout(() => {
        this.props.updatePlayStateForTempoChange({
          channel: this.props.mix.channel,
          playState: this.props.mix.playState,
          beatScale: this.props.mix.channel.beatScale
        })
      })
    }
  }

  render () {
    const { mix, audioContext, height, rowHeight, fromTrackGroup, toTrackGroup,
      scaleX, translateX, tempoAxisHeight } = this.props
    const { selectedControlType } = this.state
    if (!(mix && mix.channel)) { return null }

    const beatScale = get(mix, 'channel.beatScale')

    const createControlPoint = ({ sourceId, e, minBeat, maxBeat }) => {
      const { beat, value } = _getPosition({ e, scaleX, rowHeight })
      this.props.createControlPoint({
        sourceId, beat, value, minBeat, maxBeat
      })
      this._asyncUpdateAudioGraph()
    }
    const deleteControlPoint = (...args) => {
      this.props.deleteControlPoint(...args)
      this._asyncUpdateAudioGraph()
    }
    const updateControlPointValue = (...args) => {
      this.props.updateControlPointValue(...args)
      this._asyncUpdateAudioGraph()
    }

    const layoutActions = pick(this.props, ['updateZoom', 'moveClip',
      'moveTrackGroup', 'resizeChannel', 'updateAudioGraph', 'seekToBeat', 'moveControlPoint'])

    const trackChannelActions = {
      createControlPoint,
      deleteControlPoint,

      createAutomationClipWithControlPoint: ({ channel, e, minBeat, maxBeat }) => {
        const { beat, value } = _getPosition({ e, scaleX, rowHeight })
        this.props.createAutomationClipWithControlPoint({
          channelId: channel.id, beat, value, minBeat, maxBeat, controlType: selectedControlType
        })
        this._asyncUpdateAudioGraph()
      },

      selectGridMarker: ({ channel, clip, marker }) => {
        this.props.selectGridMarker({ clip, marker })
        this.props.clearGridMarkers({ id: clip.id })
        this._asyncUpdateAudioGraph()

        this.setState({
          editingBeatgrids: without(this.state.editingBeatgrids, channel.id)
        })
      }
    }

    const tempoClipElement = <TempoClip
      clip={mix.tempoClip}
      beatScale={beatScale}
      scaleX={scaleX}
      createControlPoint={this._wrapWithAsyncUpdatePlayState(createControlPoint)}
      deleteControlPoint={this._wrapWithAsyncUpdatePlayState(deleteControlPoint)}
      updateControlPointValue={this._wrapWithAsyncUpdatePlayState(updateControlPointValue)}
      height={tempoAxisHeight}
      minBeat={get(mix, 'channel.startBeat')}
      maxBeat={get(mix, 'channel.beatCount')}
      canDrag
    />

    const trackGroups = [
      {
        trackGroup: fromTrackGroup,
        tracks: fromTrackGroup.channels
      },
      {
        trackGroup: toTrackGroup,
        tracks: [toTrackGroup.primaryTrack]
      }
    ]
    const trackControlsElement = map(trackGroups, ({ trackGroup, tracks }) =>
      <div key={trackGroup.id} style={{ borderBottom: '1px solid grey' }}>
        {map(tracks, track => <TrackControl
          key={track.id + '_control'}
          title={track.sample.meta.title}
          bpm={track.sample.meta.bpm}
          isEditingBeatgrid={includes(this.state.editingBeatgrids, track.id)}
          toggleEditBeatgrid={this.toggleEditBeatgrid.bind(this, track)}
        />)}
      </div>
    )

    console.log('mix-arrangement-detail', { fromTrackGroup, toTrackGroup })

    return <MixArrangementLayout
      mix={mix}
      audioContext={audioContext}
      scaleX={scaleX}
      translateX={translateX}
      height={height}
      trackControls={trackControlsElement}
      showTempoAxis
      selectedControlType={selectedControlType}
      tempoAxisHeight={tempoAxisHeight}
      tempoClipElement={tempoClipElement}
      selectControlType={this.selectControlType.bind(this)}
      canDropFiles
      handleFilesDrop={this.handleFilesDrop.bind(this)}
      {...layoutActions}>

      <TrackGroup
        key={fromTrackGroup.id}
        channel={fromTrackGroup}
        beatScale={beatScale}
        translateY={0}
        scaleX={scaleX}
        rowHeight={rowHeight}
        canEditClips
        showAutomationControlType={!includes(this.state.editingBeatgrids, fromTrackGroup.id) && selectedControlType}
        color={d3.interpolateCool(0.25)}
        sampleResolution={includes(this.state.editingBeatgrids, fromTrackGroup.id)
          ? ZOOM_RESOLUTION : NORMAL_RESOLUTION}
        trackChannelActions={trackChannelActions}
      />

      <TrackGroup
        key={toTrackGroup.id}
        channel={toTrackGroup}
        beatScale={beatScale}
        translateY={rowHeight * trackGroups[0].tracks.length}
        scaleX={scaleX}
        rowHeight={rowHeight}
        canDragGroup
        showOnlyPrimaryTrack
        showAutomationControlType={!includes(this.state.editingBeatgrids, toTrackGroup.id) && selectedControlType}
        color={d3.interpolateCool(0.5)}
        sampleResolution={includes(this.state.editingBeatgrids, toTrackGroup.id)
          ? ZOOM_RESOLUTION : NORMAL_RESOLUTION}
        trackChannelActions={trackChannelActions}
      />

    </MixArrangementLayout>
  }
}

MixArrangementDetail.defaultProps = {
  height: '100%',
  rowHeight: 100,
  scaleX: 1,
  translateX: 1,
  tempoAxisHeight: 25
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
