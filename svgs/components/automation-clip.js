const React = require('react')
const d3 = require('d3')
const { map } = require('lodash')
const classnames = require('classnames')

const ControlPoint = require('./automation-clip/control-point')
const {
  CONTROL_TYPE_VOLUME,
  CONTROL_TYPE_GAIN,
  CONTROL_TYPE_LOW_BAND,
  CONTROL_TYPE_MID_BAND,
  CONTROL_TYPE_HIGH_BAND,
} = require('../../clips/constants')
const { clamp } = require('../../lib/number-utils')

class AutomationClip extends React.Component {
  render () {
    const { clip, height, scaleX, canEdit, minBeat, maxBeat, selectedControlPoint } = this.props
    if (!clip) { return null }

    const { id } = clip
    const line = d3.line()
      .x((controlPoint) => controlPoint.beat)
      .y((controlPoint) => (1 - controlPoint.value) * height)

    // performance hack: do not render too many control points
    let controlPointRadius = 10
    let { controlPoints } = clip
    const maxControlPointsToDisplay = 300
    const maxControlPointStep = 5
    if (controlPoints.length > maxControlPointsToDisplay) {
      controlPointRadius = 5
      controlPoints = []
      for (let i = 0; i < clip.controlPoints.length; i += maxControlPointStep) {
        controlPoints[i / maxControlPointStep] = clip.controlPoints[i]
      }

      // make sure clip ends in last automation point
      const lastControlPoint = clip.controlPoints[clip.controlPoints.length - 1]
      if (controlPoints[controlPoints.length - 1] !== lastControlPoint) {
        controlPoints.push(lastControlPoint)
      }
    }

    let color
    switch(clip.controlType) {
      case CONTROL_TYPE_GAIN: case CONTROL_TYPE_VOLUME: color = 'red'; break;
      case CONTROL_TYPE_LOW_BAND: case CONTROL_TYPE_MID_BAND: case CONTROL_TYPE_HIGH_BAND:
        color = 'green'; break
      default: color = 'blue'; break;
    }

    // performance hack: render all points together when not editing
    const controlPointsRendered = canEdit
      ? map(controlPoints, controlPoint => <ControlPoint
        key={controlPoint.id}
        sourceId={id}
        scaleX={scaleX}
        id={controlPoint.id}
        beat={controlPoint.beat}
        value={controlPoint.value}
        minBeat={minBeat}
        maxBeat={maxBeat}
        height={height}
        color={color}
        canEdit={canEdit}
        radius={controlPointRadius}
        isSelected={canEdit && selectedControlPoint && (controlPoint.id === selectedControlPoint.id)}
        deleteControlPoint={this.props.deleteControlPoint}
        selectControlPoint={isSelected => this.props.selectControlPoint(!isSelected && controlPoint)}
      />)
      : map(controlPoints, controlPoint => <ellipse
        key={controlPoint.id}
        className={classnames('AutomationClipControlPoint', color)}
        strokeWidth={0.3 / scaleX}
        stroke={'rgba(255,255,255,0.8)'}
        cx={controlPoint.beat}
        cy={clamp(0, (1 - controlPoint.value), 1) * height}
        rx={controlPointRadius / scaleX}
        ry={controlPointRadius}
      />)

    return <g>
      <path
        className={classnames('AutomationClipPath', color)}
        strokeWidth={1 / scaleX}
        fill='transparent'
        d={line(controlPoints)} />
      <rect width={maxBeat - minBeat} height={height} fill='transparent' />

      {controlPointsRendered}
    </g>
  }
}

AutomationClip.defaultProps = {
  height: 100,
  scaleX: 1,
  canEdit: false,
  selectedControlPoint: null,
}

module.exports = AutomationClip
