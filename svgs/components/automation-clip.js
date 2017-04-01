const React = require('react')
const d3 = require('d3')
const { map, values, sortBy } = require('lodash')

const ControlPoint = require('./automation-clip/control-point')
const getPeaks = require('../../samples/helpers/get-peaks')
const { beatToTime } = require('../../lib/number-utils')

class AutomationClip extends React.Component {
  handleClick(e) {
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
    const { clip, height, color, canDrag, minBeat, maxBeat, deleteControlPoint } = this.props
    if (!clip) { return null }

    const { id, controlPoints } = clip
    const sortedControlPoints = sortBy(values(controlPoints), 'beat')
    const median = Math.ceil(height / 2.0)
    const line = d3.line()
      .x((controlPoint) => controlPoint.beat)
      .y((controlPoint) => (1 - controlPoint.value) * height)

    return <g>
      <path stroke={color} fill='transparent' d={line(sortedControlPoints)} />

      <rect width={maxBeat - minBeat} height={height} fill='transparent'
        onMouseUp={this.handleClick.bind(this)} />

      {map(sortedControlPoints, controlPoint => <ControlPoint
        key={controlPoint.id}
        sourceId={id}
        deleteControlPoint={deleteControlPoint}
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
  canDrag: false,
  color: 'red'
}

module.exports = AutomationClip
