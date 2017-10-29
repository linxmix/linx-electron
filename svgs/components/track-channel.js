const React = require('react')
const { map, filter } = require('lodash')
const { DragSource } = require('react-dnd')

const SampleClip = require('./sample-clip')
const AutomationClip = require('./automation-clip')
const { CLIP_TYPE_SAMPLE, CLIP_TYPE_AUTOMATION } = require('../../clips/constants')
const { isRightClick } = require('../../lib/mouse-event-utils')

class TrackChannel extends React.Component {
  handleClick (e) {
    if (isRightClick(e) && this.props.showAutomationControlType) {
      e.preventDefault()
      e.stopPropagation()

      const { channel, createAutomationClipWithControlPoint } = this.props
      createAutomationClipWithControlPoint({
        e,
        minBeat: channel.startBeat,
        maxBeat: channel.beatCount
      })
    }
  }

  render () {
    const { channel, color, beatScale, translateY, scaleX, sampleResolution,
      canDragAutomations, height, showAutomationControlType, connectDragSource } = this.props
    if (!channel) { return null }

    return connectDragSource(<g
      onMouseUp={this.handleClick.bind(this)}
      transform={`translate(${channel.startBeat},${translateY})`}>
      {map(filter(channel.clips, { type: CLIP_TYPE_SAMPLE }), clip =>
        <SampleClip
          key={clip.id}
          clip={clip}
          scaleX={scaleX}
          beatScale={beatScale}
          color={color}
          sampleResolution={sampleResolution}
          height={height}
          canDrag={this.props.canDrag}
          showGridMarkers={this.props.showGridMarkers}
          selectGridMarker={this.props.selectGridMarker}
        />
      )}

      {showAutomationControlType && map(filter(channel.clips, {
        type: CLIP_TYPE_AUTOMATION,
        controlType: showAutomationControlType
      }), clip =>
        <AutomationClip
          key={clip.id}
          clip={clip}
          scaleX={scaleX}
          minBeat={channel.startBeat}
          maxBeat={channel.beatCount}
          createControlPoint={this.props.createControlPoint}
          deleteControlPoint={this.props.deleteControlPoint}
          beatScale={beatScale}
          height={height}
          canDrag={canDragAutomations}
        />
      )}
    </g>)
  }
}

TrackChannel.defaultProps = {
  translateY: 0,
  scaleX: 1,
  canDragChannel: false,
  canDragClips: false,
  canDragAutomations: false,
  height: 100,
  showAutomationControlType: undefined,
  showGridMarkers: true
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
    return props.canDragChannel
  }
}

module.exports = DragSource('track-channel', dragSource, collectDrag)(TrackChannel)
