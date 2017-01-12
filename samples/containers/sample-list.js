const React = require('react')
const { connect } = require('react-redux')
const { Link } = require('react-router')
const FileDrop = require('react-file-drop')
const { forEach } = require('lodash')

const { getSampleListProps } = require('../getters')
const { loadSampleList, createSample } = require('../actions')

class SampleListContainer extends React.Component {
  onFilesDrop (e) {
    const { createSample } = this.props
    const files = e && e.dataTransfer && e.dataTransfer.files

    console.log('file drop', e)
    if (files) {
      e.preventDefault()
      e.stopPropagation()
      forEach(files, createSample)
    }
  }

  render () {
    const { sampleList, isLoading, isCreating, error } = this.props

    return <div>
      <FileDrop
        frame={document}
        onFrameDrop={this.onFilesDrop.bind(this)} />
      <header>
        <div>samples are {isLoading ? 'loading' : 'here'}</div>
        {isCreating && <div>'creating samples…'</div>}
        <div>{error || 'no errors'}</div>
      </header>
      {sampleList.map(sample => {
        return <section key={sample.id}>
          <Link to={`/samples/${sample.id}`}>
            {sample.id}
          </Link>
        </section>
      })}
    </div>
  }

  componentDidMount () {
    const { loadSampleList } = this.props
    loadSampleList()
  }
}

module.exports = connect(
  getSampleListProps,
  { loadSampleList, createSample }
)(SampleListContainer)
