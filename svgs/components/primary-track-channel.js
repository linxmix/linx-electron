const React = require('react')
const { map, filter } = require('lodash')
const { DragSource } = require('react-dnd')

const SampleTrackChannel = require('./sample-track-channel')
const TransitionChannel = require('./transition-channel')
const SampleClip = require('./sample-clip')
const AutomationClip = require('./automation-clip')
const { CLIP_TYPE_SAMPLE, CLIP_TYPE_AUTOMATION } = require('../../clips/constants')
const {
  CHANNEL_TYPE_SAMPLE_TRACK,
  CHANNEL_TYPE_TRANSITION
} = require('../../channels/constants')

class PrimaryTrackChannel extends React.Component {
  render () {
    const { channel, color, beatScale, translateY, showTransition,
      canDragAutomations, height, showAutomations, connectDragSource } = this.props
    if (!channel) { return null }

    return connectDragSource(<g transform={`translate(${channel.startBeat},${translateY})`}>
      {showTransition && map(filter(channel.channels, { type: CHANNEL_TYPE_TRANSITION }),
        (channel, i, channels) => <TransitionChannel
          key={channel.id}
          channel={channel}
          scaleX={this.props.scaleX}
          height={height}
          canDrag={this.props.canDragTransition}
        />
      )}

      {map(filter(channel.channels, { type: CHANNEL_TYPE_SAMPLE_TRACK }),
        (channel, i, channels) => <SampleTrackChannel
          key={channel.id}
          channel={channel}
          beatScale={beatScale}
          createControlPoint={this.props.createControlPoint}
          deleteControlPoint={this.props.deleteControlPoint}
          createAutomationClipWithControlPoint={this.props.createAutomationClipWithControlPoint}
          scaleX={this.props.scaleX}
          canDrag={false}
          canDragAutomations={this.props.canDragAutomations}
          showAutomations={this.props.showAutomations}
          color={this.props.color}
        />
      )}
    </g>)
  }
}

PrimaryTrackChannel.defaultProps = {
  translateY: 0,
  scaleX: 1,
  canDrag: false,
  canDragAutomations: false,
  canDragTransition: false,
  height: 100,
  showAutomations: false,
  showTransition: false
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

module.exports = DragSource('primary-track-channel', dragSource, collectDrag)(PrimaryTrackChannel)
