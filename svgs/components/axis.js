const React = require('react')
const { map, range } = require('lodash')

class Axis extends React.Component {
  render () {
    const { scale, tickCount, height, strokeWidth, stroke } = this.props

    console.log('axis', { strokeWidth, stroke })

    return <g>
      {map(range(0, tickCount), tick => <line
        y1={0}
        y2={height}
        key={tick}
        style={{ stroke, strokeWidth }}
        transform={`translate(${scale(tick)})`}
      />)}
    </g>
  }
}

Axis.defaultProps = {
  strokeWidth: 1,
  height: 100,
  stroke: 'rgba(0, 0, 0, 0.2)'
}

module.exports = Axis
