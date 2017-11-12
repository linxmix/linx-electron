const React = require('react')

const getCurrentBeat = require('../../audios/helpers/get-current-beat')

class Playhead extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      playheadAnimationId: null,
      currentBeat: getCurrentBeat({
        playState: this.props.playState,
        audioContext: this.props.audioContext,
        beatScale: this.props.beatScale
      })
    }
  }

  render () {
    const { height, strokeWidth, stroke, seekBeat, showLastPlayMarker } = this.props
    const { currentBeat } = this.state

    return <g>
      {showLastPlayMarker && <line
        style={{ stroke: 'blue', strokeWidth: strokeWidth }}
        y1={0}
        y2={height}
        transform={`translate(${seekBeat})`}
      />}

      <line
        style={{ stroke, strokeWidth }}
        y1={0}
        y2={height}
        transform={`translate(${currentBeat})`}
      />
    </g>
  }

  animate () {
    const playheadAnimationId = window.requestAnimationFrame(this.animate.bind(this))

    this.setState({
      playheadAnimationId,
      currentBeat: getCurrentBeat({
        playState: this.props.playState,
        audioContext: this.props.audioContext,
        beatScale: this.props.beatScale
      })
    })
  }

  componentDidMount () {
    this.animate()
  }

  componentWillUnmount () {
    window.cancelAnimationFrame(this.state.playheadAnimationId)
    this.setState({
      playheadAnimationId: null
    })
  }
}

Playhead.defaultProps = {
  strokeWidth: 1.5,
  height: 100,
  stroke: 'red',
  showLastPlayMarker: false
}

module.exports = Playhead
