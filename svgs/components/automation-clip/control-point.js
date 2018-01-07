const React = require('react')
const { DragSource } = require('react-dnd')
const classnames = require('classnames')

const { isRightClick } = require('../../../lib/mouse-event-utils')
const { clamp, validNumberOrDefault } = require('../../../lib/number-utils')

class ControlPoint extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      dragX: null,
      dragY: null
    }
  }

  handleClick (e) {
    if (this.props.canEdit) {
      e.preventDefault()
      e.stopPropagation()

      if (isRightClick(e)) {
        this.props.deleteControlPoint({ id: this.props.id, sourceId: this.props.sourceId })
      } else {
        this.props.selectControlPoint(this.props.isSelected)
      }
    }
  }

  render () {
    const { beat, value, height, radius, scaleX, isSelected, connectDragSource } = this.props
    const dragX = validNumberOrDefault(this.state.dragX, 0)
    const dragY = validNumberOrDefault(this.state.dragY, 0)
    const cy = (1 - value) + dragY

    return connectDragSource(<ellipse
      className={classnames('AutomationClipControlPoint', {
        'is-selected': isSelected
      })}
      cx={beat + dragX}
      cy={clamp(0, cy, 1) * height}
      rx={radius / scaleX}
      ry={radius}
      onMouseUp={this.handleClick.bind(this)}
    />)
  }
}

ControlPoint.defaultProps = {
  height: 100,
  scaleX: 1,
  radius: 10,
  canEdit: false,
  isSelected: false
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
      component,
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
    return props.canEdit
  },
  endDrag(props, monitor, component) {
    component.setState({
      dragX: null,
      dragY: null,
    })
  }
}

module.exports = DragSource('automation-clip/control-point', dragSource, collectDrag)(ControlPoint)
