const React = require('react')
const { Link } = require('react-router')

class LayoutContainer extends React.Component {
  render () {
    const { children } = this.props

    return <div>
      <Link to='/'>
        <h1>Linx</h1>
      </Link>
      <div>{children}</div>
    </div>
  }
}

module.exports = LayoutContainer
