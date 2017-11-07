const React = require('react')
const { compact, concat, map, filter } = require('lodash')
const { DragSource } = require('react-dnd')

const TrackChannel = require('./track-channel')

class TrackGroup extends React.Component {
  render () {
    const { channel, color, beatScale, translateY, scaleX, sampleResolution, rowHeight,
      showOnlyPrimaryTrack, canDragClips, canResizeClips, showAutomationControlType,
      connectDragSource, trackChannelActions, canEditClips } = this.props
    if (!channel) { return null }

    const tracksToDisplay = filter(
      showOnlyPrimaryTrack ? [channel.primaryTrack] : channel.channels,
      track => track.id
    )

    return connectDragSource(<g
      className="TrackGroup"
      transform={`translate(${channel.startBeat},${translateY})`}>
      {map(tracksToDisplay, (track, i) => <TrackChannel
        key={track.id}
        channel={track}
        beatScale={beatScale}
        translateY={rowHeight * i}
        height={rowHeight}
        scaleX={scaleX}
        mixBeatCount={this.props.mixBeatCount}
        canDragClips={canDragClips}
        canResizeClips={canResizeClips}
        canEditClips={canEditClips && !showAutomationControlType}
        showAutomationControlType={showAutomationControlType}
        color={color}
        sampleResolution={sampleResolution}
        {...trackChannelActions}
      />)}
    </g>)      
  }
}

TrackGroup.defaultProps = {
  channel: null,
  beatScale: null,
  trackChannelActions: {},
  translateY: 0,
  scaleX: 1,
  mixBeatCount: 0,
  rowHeight: 100,
  canDragGroup: false,
  canDragClips: false,
  canResizeClips: false,
  canEditClips: false,
  showOnlyPrimaryTrack: false,
  showAutomationControlType: undefined,
}

function collectDrag (connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  }
}

const dragSource = {
  beginDrag (props, monitor, component) {
    return {
      id: props.channel.id,
      startBeat: props.channel.startBeat
    }
  },
  isDragging (props, monitor) {
    const item = monitor.getItem()
    return item && item.id && (item.id === props.channel.id)
  },
  canDrag (props) {
    return props.canDragGroup
  }
}

module.exports = DragSource('track-group', dragSource, collectDrag)(TrackGroup)
