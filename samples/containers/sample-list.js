const React = require('react')
const { connect } = require('react-redux')
const { Link } = require('react-router')

const { getSampleListProps } = require('../getters')
const { loadSampleList } = require('../actions')

class SampleListContainer extends React.Component {
  render () {
    const { sampleList, isLoading } = this.props

    return <div>
      <header>
        samples are {isLoading ? 'loading' : 'here'}
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
  { loadSampleList }
)(SampleListContainer)
