const React = require('react')
const { DragSource } = require('react-dnd')

const { isValidNumber, validNumberOrDefault } = require('../../../lib/number-utils')
const { isRightClick } = require('../../../lib/mouse-event-utils')

class ControlPoint extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      dragX: null,
      dragY: null
    }
  }

  handleClick (e) {
    e.preventDefault()
    e.stopPropagation()

    if (isRightClick(e)) {
      this.props.deleteControlPoint({ id: this.props.id, sourceId: this.props.sourceId })
    }
  }

  handleChangeValue (e) {
    const newValue = parseFloat(e.target.value)

    if (isValidNumber(newValue)) {
      this.props.updateValue({
        id: this.props.id,
        sourceId: this.props.sourceId,
        value: newValue
      })
    }
  }

  render () {
    const { beat, value, height, scaleX, connectDragSource, textBoxWidth } = this.props
    const dragX = validNumberOrDefault(this.state.dragX, 0)

    return connectDragSource(<g transform={`translate(${beat + dragX}) scale(${1 / scaleX},1)`}>
      <foreignObject height={height} width={1 / scaleX} style={{ width: '1px', border: '1px solid gray' }}
        onMouseUp={this.handleClick.bind(this)}>
        <div style={{ height: height, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <input type='text'
            style={{ width: textBoxWidth }}
            value={value}
            onChange={this.handleChangeValue.bind(this)}
          />
        </div>
      </foreignObject>
    </g>)
  }
}

ControlPoint.defaultProps = {
  height: 100,
  scaleX: 1,
  canDrag: false,
  textBoxWidth: '20px'
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
    return props.canDrag
  },
  endDrag(props, monitor, component) {
    component.setState({
      dragX: null,
      dragY: null,
    })
  }
}

module.exports = DragSource('tempo-clip/control-point', dragSource, collectDrag)(ControlPoint)
