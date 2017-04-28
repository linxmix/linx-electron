const React = require('react')
const { DragSource } = require('react-dnd')

const ResizeHandle = require('./resize-handle')

class TransitionChannel extends React.Component {
  render () {
    const { channel, height, connectDragSource, isDragging, canDrag } = this.props

    return <g transform={`translate(${channel.startBeat})`} opacity={isDragging ? 0.5 : 1}>
      <rect
        width={channel.beatCount}
        height={height}
        style={{ fill: 'rgba(0,0,255,0.2)' }}
      />
      {connectDragSource(<rect
        width={25}
        height={25}
        x={(channel.beatCount - 25) / 2}
        y={-25}
        style={{ fill: 'rgba(0,0,255,0.4)' }}
      />)}
      <ResizeHandle
        id={channel.id}
        translateX={0}
        translateY={-10}
        scaleX={this.props.scaleX}
        startBeat={channel.startBeat}
        beatCount={channel.beatCount}
        canDrag={canDrag}
      />
      <ResizeHandle
        id={channel.id}
        translateX={channel.beatCount}
        translateY={-10}
        scaleX={this.props.scaleX}
        startBeat={channel.startBeat}
        beatCount={channel.beatCount}
        canDrag={canDrag}
      />
    </g>
  }
}

TransitionChannel.defaultProps = {
  height: 100,
  scaleX: 1,
  canDrag: false
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

module.exports = DragSource('transition-channel', dragSource, collectDrag)(TransitionChannel)
