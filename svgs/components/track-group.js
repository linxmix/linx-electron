const React = require('react')
const d3 = require('d3')
const { compact, concat, get, map, filter } = require('lodash')

const TrackChannel = require('./track-channel')

class TrackGroup extends React.Component {
  render () {
    const { channel, color, beatScale, translateY, scaleX, sampleResolution, rowHeight, isEditingAutomations,
      showOnlyPrimaryTrack, canDragClips, canResizeClips, showAutomationControlType, trackChannelActions,
      canEditClips, mixMinBeat, mixBeatCount } = this.props
    if (!channel) { return null }

    const tracksToDisplay = filter(
      showOnlyPrimaryTrack ? [channel.primaryTrack] : channel.channels,
      track => track.id
    )

    return <g
      className="TrackGroup"
      transform={`translate(${channel.startBeat},${translateY})`}>
      {map(tracksToDisplay, (track, i) => <TrackChannel
        key={track.id}
        channel={track}
        beatScale={beatScale}
        clickBoxTranslateX={mixMinBeat - channel.startBeat}
        clickBoxWidth={mixBeatCount}
        translateY={rowHeight * i}
        height={rowHeight}
        scaleX={scaleX}
        canDragClips={canDragClips && !isEditingAutomations}
        canResizeClips={canResizeClips && !isEditingAutomations}
        canEditClips={canEditClips && !isEditingAutomations}
        selectedClip={get(this, `props.selectedClips[${track.id}]`)}
        selectedControlPoint={this.props.selectedControlPoint}
        showAutomationControlType={showAutomationControlType}
        canEditAutomations={isEditingAutomations && showAutomationControlType}
        isPrimaryTrack={track.id === channel.primaryTrack.id}
        color={color ||
          d3.interpolateCool((this.props.showSecondColorHalf ? 0 : 0.25) + (i / 10))}
        sampleResolution={sampleResolution}
        {...trackChannelActions}
      />)}
    </g>  
  }
}

TrackGroup.defaultProps = {
  channel: null,
  beatScale: null,
  trackChannelActions: {},
  selectedClips: {},
  selectedControlPoint: null,
  translateY: 0,
  scaleX: 1,
  rowHeight: 100,
  mixMinBeat: 0,
  mixBeatCount: 0,
  canDragClips: false,
  canResizeClips: false,
  canEditClips: false,
  showOnlyPrimaryTrack: false,
  showAutomationControlType: undefined,
  showSecondColorHalf: false,
  isEditingAutomations: false
}

module.exports = TrackGroup
