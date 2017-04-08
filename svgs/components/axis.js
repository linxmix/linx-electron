const React = require('react')
const { map, range } = require('lodash')

const { clamp, roundToNearestPowerOfTwo } = require('../../lib/number-utils')

class Axis extends React.Component {
  render () {
    const { scale, tickCount, height, strokeWidth, stroke, showText, scaleX } = this.props

    const computedStep = tickCount / (32 * scaleX)
    const step = clamp(4, roundToNearestPowerOfTwo(computedStep), 128)

    console.log('stepTHNIG', step)

    return <g>
      {map(range(0, tickCount, step), tick => <g key={tick} transform={`translate(${scale(tick)})`}>
        {showText && (computedStep < 256) && (tick % 16 === 0) && <text
          x={2}
          y="50%"
          opacity={0.75}
          transform={`scale(${1.0 / scaleX}, 1)`}>
            {tick / 16}
        </text>}

        <line
          y1={0}
          y2={height}
          style={{ stroke, strokeWidth }}
          opacity={(tick % 16 === 0) ? 1 : 0.5}
        />
      </g>)}
    </g>
  }
}

Axis.defaultProps = {
  strokeWidth: 1,
  height: 100,
  stroke: 'rgba(0, 0, 0, 0.3)',
  showText: false,
  scaleX: 1
}

module.exports = Axis
