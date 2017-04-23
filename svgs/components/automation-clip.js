const React = require('react')
const d3 = require('d3')
const { map } = require('lodash')

const ControlPoint = require('./automation-clip/control-point')

class AutomationClip extends React.Component {
  handleClick (e) {
    if (e && e.nativeEvent && e.nativeEvent.which === 3) {
      e.preventDefault()
      e.stopPropagation()
      this.props.createControlPoint({
        e,
        sourceId: this.props.clip.id,
        minBeat: this.props.minBeat,
        maxBeat: this.props.maxBeat
      })
    }
  }

  render () {
    const { clip, height, scaleX, color, canDrag, minBeat, maxBeat, deleteControlPoint } = this.props
    if (!clip) { return null }

    const { id, controlPoints } = clip
    const line = d3.line()
      .x((controlPoint) => controlPoint.beat)
      .y((controlPoint) => (1 - controlPoint.value) * height)

    return <g>
      <path strokeWidth={1 / scaleX} stroke={color} fill='transparent' d={line(controlPoints)} />

      <rect width={maxBeat - minBeat} height={height} fill='transparent'
        onMouseUp={this.handleClick.bind(this)} />

      {map(controlPoints, controlPoint => <ControlPoint
        key={controlPoint.id}
        sourceId={id}
        deleteControlPoint={deleteControlPoint}
        scaleX={scaleX}
        id={controlPoint.id}
        beat={controlPoint.beat}
        value={controlPoint.value}
        minBeat={minBeat}
        maxBeat={maxBeat}
        height={height}
        canDrag={canDrag}
      />)}
    </g>
  }
}

AutomationClip.defaultProps = {
  height: 100,
  scaleX: 1,
  canDrag: false,
  color: 'red'
}

module.exports = AutomationClip
