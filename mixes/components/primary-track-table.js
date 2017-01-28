const React = require('react')
const { forEach, last, get } = require('lodash')
const ReactTable = require('react-table').default

class PrimaryTrackTable extends React.Component {
  render () {
    const { tracks } = this.props
    console.log('tracks', tracks)

    const columns = [{
      id: 'number',
      header: '#',
      accessor: (track) => track.index + 1,
      width: 30,
    }, {
      header: 'Title',
      accessor: 'meta.title',
      minWidth: 100,
      render: props => <span title={props.value}>{props.value}</span>
    }, {
      header: 'Artist',
      accessor: 'meta.artist',
      minWidth: 100,
      render: props => <span title={props.value}>{props.value}</span>
    }, {
      header: 'Key',
      accessor: 'meta.key',
      minWidth: 70,
      maxWidth: 100,
    }, {
      header: 'Bpm',
      accessor: 'meta.bpm',
      minWidth: 50,
      maxWidth: 100,
    }]

    return <div>
      <ReactTable
        data={tracks}
        columns={columns}
        showPagination={false}
        minRows={0}
        className="-striped -highlight"
      />
    </div>
  }
}

module.exports = PrimaryTrackTable
