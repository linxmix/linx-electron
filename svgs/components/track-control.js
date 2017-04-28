const React = require('react')
const { DragSource } = require('react-dnd')
const uuid = require('uuid/v4')

// TODO: does this really belong under svgs/? its not an svg
class TrackControl extends React.Component {
  render () {
    const { title, bpm, height, width, isEditingBeatgrid, toggleEditBeatgrid } = this.props
    const editBeatgridInputId = uuid()

    return <div style={{ height, width, borderBottom: '1px solid gray' }}>
      {title}
      <div>BPM: {bpm}</div>
      <div>
        <input id={editBeatgridInputId}
          type='checkbox' checked={isEditingBeatgrid} onChange={toggleEditBeatgrid} />
        <label htmlFor={editBeatgridInputId}>Edit Beatgrid</label>
      </div>
    </div>
  }
}

TrackControl.defaultProps = {
  height: 100,
  width: '100%'
}

module.exports = TrackControl
