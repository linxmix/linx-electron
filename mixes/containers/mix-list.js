const React = require('react')
const { connect } = require('react-redux')
const { Link } = require('react-router')

const { getMixListProps } = require('../getters')
const { loadMixList } = require('../actions')

class MixListContainer extends React.Component {
  render () {
    const { mixList, isLoading } = this.props

    return <div>
      <header>
        mixes are {isLoading ? 'loading' : 'here'}
      </header>
      {mixList.map(mix => {
        return <section key={mix.id}>
          <Link to={`/mixes/${mix.id}`}>
            {mix.id}
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
  { loadMixList }
)(MixListContainer)
