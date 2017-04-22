const React = require('react')
const { DragSource } = require('react-dnd')

// TODO: does this really belong under svgs/? its not an svg
class TrackControl extends React.Component {
  render () {
    const { title, bpm, height, width } = this.props

    return <div style={{ height, width, borderBottom: '1px solid gray' }}>
      {title}
      <div>BPM: {bpm}</div>
    </div>
  }
}

TrackControl.defaultProps = {
  height: 100,
  width: '100%'
}

module.exports = TrackControl
