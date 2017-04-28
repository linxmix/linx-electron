const React = require('react')

const getCurrentBeat = require('../../audios/helpers/get-current-beat')

class Playhead extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      playheadAnimationId: null,
      seekBeat: getCurrentBeat({
        playState: this.props.playState,
        audioContext: this.props.audioContext,
        beatScale: this.props.beatScale
      })
    }
  }

  render () {
    const { height, strokeWidth, stroke } = this.props
    const { seekBeat } = this.state

    return <line
      style={{ stroke, strokeWidth }}
      y1={0}
      y2={height}
      transform={`translate(${seekBeat})`}
    />
  }

  animate () {
    const playheadAnimationId = window.requestAnimationFrame(this.animate.bind(this))

    this.setState({
      playheadAnimationId,
      seekBeat: getCurrentBeat({
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
  stroke: 'red'
}

module.exports = Playhead
