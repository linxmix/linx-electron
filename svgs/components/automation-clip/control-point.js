const React = require('react')
const d3 = require('d3')
const { DragSource } = require('react-dnd')

class ControlPoint extends React.Component {
  render () {
    const { sourceId, id, beat, value, height, connectDragSource } = this.props
    console.log('controlPoint', id, beat, value)

    return connectDragSource(<circle
      cx={beat}
      cy={(1 - value) * height}
      r={10}
      style={{ fill: '#B8DE44' }}
    />)
  }
}

ControlPoint.defaultProps = {
  height: 100,
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
      sourceId: props.sourceId,
      id: props.id,
      beat: props.beat,
      value: props.value,
      height: props.height,
      minBeat: props.minBeat,
      maxBeat: props.maxBeat
    }
  },
  isDragging (props, monitor) {
    const item = monitor.getItem()
    return item && item.id && (item.id === props.id)
  },
  canDrag (props) {
    return props.canDrag
  }
}

module.exports = DragSource('control-point', dragSource, collectDrag)(ControlPoint)
