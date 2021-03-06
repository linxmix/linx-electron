const React = require('react')
const d3 = require('d3')
const { map } = require('lodash')

const ControlPoint = require('./tempo-clip/control-point')
const { isRightClick, getPosition } = require('../../lib/mouse-event-utils')

class TempoClip extends React.Component {
  handleClick (e) {
    if (isRightClick(e) && this.props.canEdit) {
      e.preventDefault()
      e.stopPropagation()

      let { beat, value } = getPosition({ e, scaleX: this.props.scaleX, height: this.props.height })
      
      // subtract this because the rect target is offset this amount
      beat += this.props.minBeat

      this.props.createControlPoint({
        sourceId: this.props.clip.id,
        beat,
        value,
        minBeat: this.props.minBeat,
        maxBeat: this.props.maxBeat
      })
    }
  }

  render () {
    const { clip, height, scaleX, deleteControlPoint, updateControlPointValue,
      canEdit, minBeat, maxBeat } = this.props
    if (!clip) { return null }

    const { id, controlPoints } = clip

    return <g>
      <rect
        x={minBeat}
        width={maxBeat - minBeat}
        height={height}
        fill='transparent'
        onMouseUp={this.handleClick.bind(this)}
      />

      {map(controlPoints, controlPoint => <ControlPoint
        key={controlPoint.id}
        sourceId={id}
        deleteControlPoint={deleteControlPoint}
        updateValue={updateControlPointValue}
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

TempoClip.defaultProps = {
  height: 100,
  scaleX: 1,
  canEdit: false,
  minBeat: 0,
  maxBeat: 0
}

module.exports = TempoClip
