const React = require('react')
const d3 = require('d3')
const { map, values } = require('lodash')

const ControlPoint = require('./automation-clip/control-point')
const getPeaks = require('../../samples/helpers/get-peaks')
const { beatToTime } = require('../../lib/number-utils')

class AutomationClip extends React.Component {
  render () {
    const { clip, height, color, canDrag } = this.props
    if (!clip) { return null }

    const { id, startBeat, controlPoints } = clip

    const median = Math.ceil(height / 2.0)

    return <g transform={`translate(${startBeat})`}>
      {map(values(controlPoints), controlPoint => <ControlPoint
        key={controlPoint.id}
        sourceId={id}
        id={controlPoint.id}
        beat={controlPoint.beat}
        value={controlPoint.value}
        height={height}
        canDrag={canDrag}
      />)}
    </g>
  }
}

AutomationClip.defaultProps = {
  height: 100,
  canDrag: false
}

module.exports = AutomationClip
