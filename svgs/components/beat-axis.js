const React = require('react')
const { map, range } = require('lodash')

const { clamp, roundToNearestPowerOfTwo } = require('../../lib/number-utils')

class BeatAxis extends React.Component {
  render () {
    const { minStep, maxStep, phraseBeatCount, beatCount, height, strokeWidth, stroke,
      showText, scaleX } = this.props

    const computedStep = (phraseBeatCount * 2) / scaleX
    const step = clamp(minStep, roundToNearestPowerOfTwo(computedStep), maxStep)

    return <g>
      {map(range(0, beatCount, step), tick => <g key={tick} transform={`translate(${tick})`}>
        {showText && (computedStep < 256) && (tick % phraseBeatCount === 0) && <text
          x={2}
          y='50%'
          opacity={0.75}
          transform={`scale(${1.0 / scaleX}, 1)`}>
            {tick / phraseBeatCount}
        </text>}

        <line
          y1={0}
          y2={height}
          style={{ stroke, strokeWidth }}
          opacity={(tick % phraseBeatCount === 0) ? 1 : 0.5}
        />
      </g>)}
    </g>
  }
}

BeatAxis.defaultProps = {
  strokeWidth: 1,
  height: 100,
  stroke: 'rgba(0, 0, 0, 0.3)',
  showText: false,
  scaleX: 1,
  minStep: 4,
  maxStep: 128,
  phraseBeatCount: 16
}

module.exports = BeatAxis
