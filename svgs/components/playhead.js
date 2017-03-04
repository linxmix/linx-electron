const React = require('react')

const { timeToBeat, validNumberOrDefault } = require('../../lib/number-utils')
const { PLAY_STATE_PLAYING } = require('../../audio/constants')

// TODO: pass this in from reducer, computed from masterChannel beatGrid
function _timeToBeat(time) {
  return timeToBeat(time, 128)
}

class Playhead extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      playheadAnimationId: null,
      seekBeat: this.getCurrentBeat()
    }
  }

  getCurrentBeat () {
    const { playState, audioContext} = this.props

    let currentBeat = playState.seekBeat
    if (playState.status === PLAY_STATE_PLAYING) {
      currentBeat += _timeToBeat(audioContext.currentTime - playState.absSeekTime)
    }

    return validNumberOrDefault(currentBeat, 0)
  }

  render () {
    const { playState, audioContext, height, strokeWidth, stroke } = this.props
    const { seekBeat } = this.state

    return <line
      style={{ stroke, strokeWidth }}
      y1={0}
      y2={height}
      transform={`translate(${seekBeat})`}
    />
  }

  animate () {
    const playheadAnimationId = requestAnimationFrame(this.animate.bind(this))

    this.setState({
      playheadAnimationId,
      seekBeat: this.getCurrentBeat()
    })
  }

  componentDidMount () {
    this.animate()
  }

  componentWillUnmount () {
    cancelAnimationFrame(this.state.playheadAnimationId)
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
