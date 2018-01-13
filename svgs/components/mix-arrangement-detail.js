const React = require('react')
const { assign, compact, find, forEach, pick, get, map, without, includes,
  concat } = require('lodash')
const keymaster = require('keymaster')

const MixArrangementLayout = require('./mix-arrangement-layout')
const TrackGroup = require('./track-group')
const TrackControl = require('./track-control')
const TempoClip = require('./tempo-clip')
const getCurrentBeat = require('../../audios/helpers/get-current-beat')
const { beatToTime } = require('../../lib/number-utils')
const { getPosition } = require('../../lib/mouse-event-utils')

const { CLIP_TYPE_SAMPLE, CONTROL_TYPE_GAIN } = require('../../clips/constants')
const { CHANNEL_TYPE_SAMPLE_TRACK, CHANNEL_TYPE_PRIMARY_TRACK } = require('../../channels/constants')

const ZOOM_RESOLUTION = 15
const NORMAL_RESOLUTION = 10

class MixArrangementDetail extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      editingBeatgrids: [],
      selectedClips: {},
      selectedControlType: CONTROL_TYPE_GAIN,
      selectedControlPointId: null,
      isEditingAutomations: false
    }
  }

  componentDidMount () {
    keymaster('esc', () => this.toggleIsEditingAutomations())
  }

  componentWillUnmount () {
    keymaster.unbind('esc')
  }

  selectControlType (controlType) {
    this.setState({
      selectedControlType: controlType,
      isEditingAutomations: !!controlType
    })
  }

  selectControlPoint ({ controlPoint }) {
    this.setState({ selectedControlPointId: controlPoint.id || null })
  }

  toggleIsEditingAutomations () {
    this.setState({
      isEditingAutomations: !(this.state.isEditingAutomations)
    })
  }

  selectClip ({ clip, channel }) {
    const selectedClips = this.state.selectedClips
    const selectedClip = selectedClips[channel.id]

    if (!selectedClip || selectedClip.id !== clip.id) {
      this.setState({
        selectedClips: {
          ...selectedClips,
          [channel.id]: clip
        }
      })
    } else {
      this.setState({
        selectedClips: {
          ...selectedClips,
          [channel.id]: null
        }
      })
    }
  }

  handleFilesDrop ({ files, beat, quantization }) {
    const { fromTrackGroup, createSampleTrackFromFile } = this.props

    forEach(files, file => createSampleTrackFromFile({
      file,
      parentChannelId: fromTrackGroup.id,
      channelAttrs: {
        startBeat: fromTrackGroup.startBeat,
      },
      clipAttrs: {
        startBeat: beat - fromTrackGroup.startBeat
      }
    }))
  }

  toggleEditBeatgrid (track) {
    const { id } = track

    // hack: guess we're talking about a single clip in track channel
    // TODO: fix this, track channels may have many clips. maybe needs a util
    //       eg clipsAtTime(playTime, [mix|channel])
    const sampleClip = find(track.clips, { type: CLIP_TYPE_SAMPLE })

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

      const currentClipBeat = currentMixBeat - track.parentChannel.startBeat - track.startBeat -
        sampleClip.startBeat
      const currentAudioTime = beatToTime(currentClipBeat, sampleClip.sample.meta.bpm) +
        sampleClip.audioStartTime

    console.log('toggleEditBeatgrid', { track, sampleClip, currentClipBeat, currentAudioTime })
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
    // Make sure this.props.mix is updated from previous action
    window.setTimeout(() => this.props.updateAudioGraph({ channel: this.props.mix.channel }))
  }

  _asyncUpdateAudioGraphForTempoChange () {
    window.setTimeout(() => {
      const { mix, seekToBeat, audioContext } = this.props

      // on master tempo automation change, seek to current beat to retain correct position
      seekToBeat({
        channel: mix.channel,
        seekBeat: getCurrentBeat({
          audioContext,
          playState: mix.playState,
          beatScale: mix.channel.beatScale
        })
      })
    })
  }

  render () {
    const { mix, audioContext, height, rowHeight, fromTrackGroup, toTrackGroup,
      scaleX, translateX, tempoAxisHeight } = this.props
    const { selectedControlType, isEditingAutomations, selectedControlPointId } = this.state

    if (!(mix && mix.channel)) { return null }

    const selectedControlPoint = _findControlPoint(mix.channel, selectedControlPointId)
    const selectedAutomation = selectedControlPoint ? {
      controlPoint: selectedControlPoint,
      clip: get(selectedControlPoint, 'clip'),
      channel: get(selectedControlPoint, 'clip.channel')
    } : {}
    const beatScale = get(mix, 'channel.beatScale')

    const createControlPoint = (...args) => {
      this.props.createControlPoint(...args)
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

    const layoutActions = pick(this.props, ['updateZoom', 'moveClip', 'resizeSampleClip',
      'moveTrackGroup', 'resizeChannel', 'updateAudioGraph', 'seekToBeat', 'moveControlPoint',
      'onDragSampleClip', 'updateControlPointPosition', 'updateControlPointValue', 'getQuantization'])

    const trackChannelActions = {
      createControlPoint,
      deleteControlPoint,
      selectAutomation: this.selectControlPoint.bind(this),
      selectClip: this.selectClip.bind(this),

      createAutomationClipWithControlPoint: ({ channelId, beat, value, minBeat, maxBeat }) => {
        this.props.createAutomationClipWithControlPoint({
          channelId, beat, value, minBeat, maxBeat, controlType: selectedControlType
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
      },

      createSampleClip: (options) => {
        this.props.createSampleClip(options)
        this._asyncUpdateAudioGraph()
      },

      deleteClip: ({ clipId, channel }) => {
        this.props.removeClipsFromChannel({ clipIds: [clipId], channelId: channel.id })
        this._asyncUpdateAudioGraph()
      },

      snipClip: ({ clip, channel, beat }) => {
        this.props.snipClip({ channel, clip, snipAtBeat: beat })
        this._asyncUpdateAudioGraph()
      }
    }

    const tempoClipElement = <TempoClip
      clip={mix.tempoClip}
      beatScale={beatScale}
      scaleX={scaleX}
      createControlPoint={(options) => {
        createControlPoint(assign({}, options, {
          value: get(fromTrackGroup, 'primaryTrack.sample.meta.bpm')
        }))
        this._asyncUpdateAudioGraphForTempoChange()
      }}
      deleteControlPoint={(options) => {
        deleteControlPoint(options)
        this._asyncUpdateAudioGraphForTempoChange()
      }}
      updateControlPointValue={(options) => {
        updateControlPointValue(options)
        this._asyncUpdateAudioGraphForTempoChange()
      }}
      height={tempoAxisHeight}
      minBeat={get(mix, 'channel.minBeat')}
      maxBeat={get(mix, 'channel.maxBeat')}
      canEdit
    />

    const trackGroups = [
      {
        trackGroup: fromTrackGroup,
        tracks: fromTrackGroup.channels
      },
      {
        trackGroup: toTrackGroup,
        tracks: toTrackGroup && toTrackGroup.channels
      }
    ]
    const trackControlsElement = map(trackGroups, ({ trackGroup, tracks }) =>
      trackGroup && <div key={trackGroup.id} style={{ borderBottom: '1px solid grey' }}>
        {map(tracks, track => <TrackControl
          key={track.id + '_control'}
          title={get(track, 'sample.meta.title')}
          bpm={get(track, 'sample.meta.bpm')}
          musicalKey={get(track, 'sample.meta.key')}
          delayTime={get(track, 'delayTime')}
          gain={get(track, 'gain')}
          pitchSemitones={track.pitchSemitones}
          isEditingBeatgrid={includes(this.state.editingBeatgrids, track.id)}
          isSoloTrack={mix.playState.soloChannelId === track.id}
          canDeleteTrack={track.type !== CHANNEL_TYPE_PRIMARY_TRACK}
          deleteTrack={() => {
            this.props.unsetChannel(track.id)
            this._asyncUpdateAudioGraph()
          }}
          toggleEditBeatgrid={this.toggleEditBeatgrid.bind(this, track)}
          toggleSoloTrack={() => this.props.toggleSoloChannel({
            soloChannelId: track.id,
            channel: mix.channel
          })}
          updatePitchSemitones={pitchSemitones => {
            this.props.updateChannel({ id: track.id, pitchSemitones })
            this._asyncUpdateAudioGraph()
          }}
          updateGain={gain => {
            this.props.updateChannel({ id: track.id, gain })
            this._asyncUpdateAudioGraph()
          }}
          updateBpm={bpm => {
            this.props.updateAndSaveMeta({ id: get(track, 'sample.meta.id'), bpm })
            this._asyncUpdateAudioGraph()
          }}
          selectDelayTime={delayTime => {
            this.props.updateChannel({ id: track.id, delayTime })
            this._asyncUpdateAudioGraph()
          }}
        />)}
      </div>
    )

    console.log('mix-arrangement-detail', { mix, fromTrackGroup, toTrackGroup, selectedAutomation })

    return <MixArrangementLayout
      mix={mix}
      audioContext={audioContext}
      scaleX={scaleX}
      translateX={translateX}
      height={height}
      trackControls={trackControlsElement}
      showTempoAxis
      isEditingAutomations={isEditingAutomations}
      selectedControlType={selectedControlType}
      selectedAutomation={selectedAutomation}
      tempoAxisHeight={tempoAxisHeight}
      tempoClipElement={tempoClipElement}
      selectControlType={this.selectControlType.bind(this)}
      showLastPlayMarker={mix.playState.isPlaying}
      canDropFiles
      handleFilesDrop={this.handleFilesDrop.bind(this)}
      updateAutomationValue
      toggleIsEditingAutomations={this.toggleIsEditingAutomations.bind(this)}
      {...layoutActions}>

      <TrackGroup
        key={fromTrackGroup.id}
        channel={fromTrackGroup}
        beatScale={beatScale}
        translateY={0}
        scaleX={scaleX}
        rowHeight={rowHeight}
        mixMinBeat={mix.channel.minBeat}
        mixBeatCount={mix.channel.beatCount}
        canResizeClips
        canDragClips
        canEditClips
        selectedClips={this.state.selectedClips}
        selectedControlPoint={selectedControlPoint}
        showAutomationControlType={!includes(this.state.editingBeatgrids, fromTrackGroup.id) && selectedControlType}
        isEditingAutomations={isEditingAutomations}
        sampleResolution={includes(this.state.editingBeatgrids, fromTrackGroup.id)
          ? ZOOM_RESOLUTION : NORMAL_RESOLUTION}
        trackChannelActions={trackChannelActions}
      />

      <rect
        height={1}
        fill="rgba(0,0,0,0.7)"
        x={mix.channel.minBeat}
        width={mix.channel.beatCount}
        y={rowHeight * trackGroups[0].tracks.length}
      />

      {toTrackGroup && <TrackGroup
        key={toTrackGroup.id}
        channel={toTrackGroup}
        beatScale={beatScale}
        translateY={rowHeight * trackGroups[0].tracks.length}
        scaleX={scaleX}
        rowHeight={rowHeight}
        mixMinBeat={mix.channel.minBeat}
        mixBeatCount={mix.channel.beatCount}
        canResizeClips
        canDragClips
        canEditClips
        showSecondColorHalf
        selectedClips={this.state.selectedClips}
        selectedControlPoint={selectedControlPoint}
        showAutomationControlType={!includes(this.state.editingBeatgrids, toTrackGroup.id) && selectedControlType}
        isEditingAutomations={isEditingAutomations}
        sampleResolution={includes(this.state.editingBeatgrids, toTrackGroup.id)
          ? ZOOM_RESOLUTION : NORMAL_RESOLUTION}
        trackChannelActions={trackChannelActions}
      />}

    </MixArrangementLayout>
  }
}

// TODO: the state belongs in reducer, and this logic belongs in getter
function _findControlPoint(channel, controlPointId) {
  if (!controlPointId) { return }

  // search this channel's clips
  let controlPoint = compact(map(channel.clips || [],
    clip => find(clip.controlPoints, { id: controlPointId })))[0]

  // search this channel's channels
  if (!controlPoint) {
    controlPoint = compact(map(channel.channels || [],
      channel => _findControlPoint(channel, controlPointId)))[0]
  }

  return controlPoint
}

MixArrangementDetail.defaultProps = {
  height: '100%',
  rowHeight: 100,
  scaleX: 1,
  translateX: 1,
  tempoAxisHeight: 25,
  soloTrackId: null
}

module.exports = MixArrangementDetail
