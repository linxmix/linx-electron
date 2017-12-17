const React = require('react')
const d3 = require('d3')
const { map } = require('lodash')

const ControlPoint = require('./automation-clip/control-point')
const {
  CONTROL_TYPE_GAIN,
  CONTROL_TYPE_LOW_BAND,
  CONTROL_TYPE_MID_BAND,
  CONTROL_TYPE_HIGH_BAND,
} = require('../../clips/constants')

class AutomationClip extends React.Component {
  render () {
    const { clip, height, scaleX, canEdit, minBeat, maxBeat, deleteControlPoint } = this.props
    if (!clip) { return null }

    const { id, controlPoints } = clip
    const line = d3.line()
      .x((controlPoint) => controlPoint.beat)
      .y((controlPoint) => (1 - controlPoint.value) * height)

    let color
    switch(clip.controlType) {
      case CONTROL_TYPE_GAIN: color = 'red'; break;
      case CONTROL_TYPE_LOW_BAND: case CONTROL_TYPE_MID_BAND: case CONTROL_TYPE_HIGH_BAND:
        color = 'green'; break
      default: color = 'blue'; break;
    }

    return <g>
      <path strokeWidth={1 / scaleX} stroke={color} fill='transparent' d={line(controlPoints)} />
      <rect width={maxBeat - minBeat} height={height} fill='transparent' />

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
        canEdit={canEdit}
      />)}
    </g>
  }
}

AutomationClip.defaultProps = {
  height: 100,
  scaleX: 1,
  canEdit: false
}

module.exports = AutomationClip
