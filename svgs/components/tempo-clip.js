const React = require('react')
const d3 = require('d3')
const { map } = require('lodash')

const ControlPoint = require('./tempo-clip/control-point')
const { isRightClick } = require('../../lib/mouse-event-utils')

class TempoClip extends React.Component {
  handleClick (e) {
    if (isRightClick(e)) {
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
    const { clip, height, scaleX, deleteControlPoint, updateControlPointValue,
      canDrag, minBeat, maxBeat } = this.props
    if (!clip) { return null }

    const { id, controlPoints } = clip

    return <g>
      <rect width={maxBeat - minBeat} height={height} fill='transparent'
        onMouseUp={this.handleClick.bind(this)} />

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
        canDrag={canDrag}
      />)}
    </g>
  }
}

TempoClip.defaultProps = {
  height: 100,
  scaleX: 1,
  canDrag: false,
  minBeat: 0,
  maxBeat: 0
}

module.exports = TempoClip
