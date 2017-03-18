const React = require('react')

class TransitionChannel extends React.Component {
  render () {
    const { channel } = this.props

    return <g transform={`translate(${channel.startBeat})`}>
      <rect
        width={channel.beatCount}
        height='100%'
        style={{ fill: 'rgba(0,0,255,0.2)' }}
      />
    </g>
  }
}

module.exports = TransitionChannel
