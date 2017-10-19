const React = require('react')
const { DragSource } = require('react-dnd')

const { isRightClick } = require('../../../lib/mouse-event-utils')

class ControlPoint extends React.Component {
  handleClick (e) {
    if (isRightClick(e)) {
      e.preventDefault()
      e.stopPropagation()
      this.props.deleteControlPoint({ id: this.props.id, sourceId: this.props.sourceId })
    }
  }

  render () {
    const { beat, value, height, radius, scaleX, connectDragSource } = this.props

    return connectDragSource(<ellipse
      cx={beat}
      cy={(1 - value) * height}
      rx={radius / scaleX}
      ry={radius}
      style={{ fill: '#B8DE44' }}
      onMouseUp={this.handleClick.bind(this)}
    />)
  }
}

ControlPoint.defaultProps = {
  height: 100,
  scaleX: 1,
  radius: 10,
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

module.exports = DragSource('automation-clip/control-point', dragSource, collectDrag)(ControlPoint)
