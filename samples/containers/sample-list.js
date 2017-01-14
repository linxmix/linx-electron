const React = require('react')
const { connect } = require('react-redux')
const { Link } = require('react-router')
const FileDrop = require('react-file-drop')
const { forEach, filter, isEmpty } = require('lodash')

const { getSampleListProps } = require('../getters')
const { loadSampleList, createSample } = require('../actions')
const { pluralize } = require('../../lib/string-utils')

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
    const { sampleList, isLoadingList, creatingSamples, error } = this.props
    const analyzingSamples = filter(sampleList, { isAnalyzing: true })
    const isAnalyzing = !isEmpty(analyzingSamples)
    const isCreating = !isEmpty(creatingSamples)

    const creatingText = `creating ${creatingSamples.length} ${pluralize(creatingSamples.length, 'sample')}…`
    const analyzingText = `analyzing ${analyzingSamples.length} ${pluralize(analyzingSamples.length, 'sample')}…`
    
    console.log('sampleList', sampleList)

    return <div>
      <FileDrop
        frame={document}
        onFrameDrop={this.onFilesDrop.bind(this)} />
      <header>
        <div>samples are {isLoadingList ? 'loading' : 'here'}</div>
        {isCreating && <div>{creatingText}</div>}
        {isAnalyzing && <div>{analyzingText}</div>}
        <div>{error || 'no errors'}</div>
      </header>
      {sampleList.map(sample => {
        return <section key={sample.id}>
          <Link to={`/samples/${sample.id}`}>
            {sample.meta.title || sample.id}
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
