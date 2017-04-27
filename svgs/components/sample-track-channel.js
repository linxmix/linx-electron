const React = require('react')
const { map, filter } = require('lodash')
const { DragSource } = require('react-dnd')

const SampleClip = require('./sample-clip')
const AutomationClip = require('./automation-clip')
const { CLIP_TYPE_SAMPLE, CLIP_TYPE_AUTOMATION } = require('../../clips/constants')
const { isRightClick } = require('../../lib/mouse-event-utils')

class SampleTrackChannel extends React.Component {
  handleClick (e) {
    if (isRightClick(e) && this.props.showAutomations) {
      e.preventDefault()
      e.stopPropagation()

      const { channel, createAutomationClipWithControlPoint } = this.props
      createAutomationClipWithControlPoint({
        e,
        channelId: channel.id,
        minBeat: channel.startBeat,
        maxBeat: channel.beatCount,
      })
    }
  }

  render () {
    const { channel, color, beatScale, translateY, scaleX, sampleResolution,
      canDragAutomations, height, showAutomations, connectDragSource } = this.props
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
        />
      )}

      {showAutomations && map(filter(channel.clips, { type: CLIP_TYPE_AUTOMATION }), clip =>
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

SampleTrackChannel.defaultProps = {
  translateY: 0,
  scaleX: 1,
  canDrag: false,
  canDragAutomations: false,
  height: 100,
  showAutomations: false
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
    return props.canDrag
  }
}

module.exports = DragSource('sample-track-channel', dragSource, collectDrag)(SampleTrackChannel)
