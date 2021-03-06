const React = require('react')
const { connect } = require('react-redux')
const { Link } = require('react-router')

const { getMixListProps } = require('../getters')
const { loadMixList, createMix } = require('../actions')

class MixListContainer extends React.Component {
  render () {
    const { mixList, isLoadingList, error, createMix } = this.props

    return <div>
      <header>
        <div>mixes are {isLoadingList ? 'loading' : 'here'}</div>
        <div>{error || 'no errors'}</div>
        <button onClick={createMix}>Create Mix</button>
      </header>

      {mixList.map(mix => {
        return <section key={mix.id}>
          <Link to={`/mixes/${mix.id}`}>
            {mix.meta.title || mix.id}
          </Link>
        </section>
      })}
    </div>
  }

  componentDidMount () {
    const { loadMixList } = this.props
    loadMixList()
  }
}

module.exports = connect(
  getMixListProps,
  { loadMixList, createMix }
)(MixListContainer)
