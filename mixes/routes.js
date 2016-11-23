const React = require('react')
const { Route, IndexRoute } = require('react-router')

const MixListContainer = require('./containers/mix-list')
const MixContainer = require('./containers/mix')

module.exports = <Route path='/mixes'>
  <IndexRoute component={MixListContainer} />
  <Route path=':mixId' component={MixContainer} />
</Route>
