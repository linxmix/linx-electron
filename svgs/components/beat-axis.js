const React = require('react')
const { map, range } = require('lodash')

const { clamp, roundTo, roundToNearestPowerOfTwo } = require('../../lib/number-utils')
const { isRightClick } = require('../../lib/mouse-event-utils')

class BeatAxis extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      displayTimestamp: false
    }
  }

  handleClick (e) {
    if (isRightClick(e)) {
      e.preventDefault()
      e.stopPropagation()

      this.setState({
        displayTimestamp: !this.state.displayTimestamp
      })
    }
  }

  render () {
    const { minStep, maxStep, phraseBeatCount, minBeat, maxBeat, height, strokeWidth, stroke,
      showText, scaleX, beatScale } = this.props

    const computedStep = (phraseBeatCount * 2) / scaleX
    const step = clamp(minStep, roundToNearestPowerOfTwo(computedStep), maxStep)
    const ticks = range(roundTo(minBeat, phraseBeatCount), maxBeat, step)

    console.log('beatAxis', { minBeat, maxBeat, step, computedStep })

    return <g onMouseUp={this.handleClick.bind(this)} style={{ userSelect: 'none' }}>
      {map(ticks, tick => <g key={tick} transform={`translate(${tick})`}>
        {showText && (computedStep < 256) && (tick % phraseBeatCount === 0) && <text
          x={2}
          y='50%'
          opacity={0.75}
          transform={`scale(${1.0 / scaleX}, 1)`}>
            {this.state.displayTimestamp ?
              _calculateHumanReadableTimestamp(beatScale(tick)) : (tick / phraseBeatCount)}
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
  phraseBeatCount: 16,
  beatScale: null
}

module.exports = BeatAxis

function _calculateHumanReadableTimestamp(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = _keepTwoDigits(Math.round(totalSeconds % 60))

  return `${minutes}:${seconds}`
}

function _keepTwoDigits(n) {
  return (n).toLocaleString(undefined, { minimumIntegerDigits: 2, useGrouping:false })
}
