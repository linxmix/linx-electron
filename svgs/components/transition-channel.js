const React = require('react')
const { DragSource } = require('react-dnd')

class TransitionChannel extends React.Component {
  render () {
    const { channel, height, connectDragSource, connectDragPreview, isDragging } = this.props

    return connectDragPreview(<g transform={`translate(${channel.startBeat})`} opacity={isDragging ? 0.5 : 1}>
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
    </g>)
  }
}

TransitionChannel.defaultProps = {
  height: 100,
  canDrag: false
}

function collectDrag (connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    connectDragPreview: connect.dragPreview(),
    isDragging: monitor.isDragging()
  }
}

const dragSource = {
  beginDrag (props, monitor, component) {
    console.log('drag transition channel')
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
