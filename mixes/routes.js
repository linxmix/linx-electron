const React = require('react')
const { Route, IndexRoute } = require('react-router')

const MixListContainer = require('./containers/mix-list')
const MixOverviewContainer = require('./containers/mix-overview')
const MixDetailContainer = require('./containers/mix-detail')

module.exports = <Route path='/mixes'>
  <IndexRoute component={MixListContainer} />
  <Route path=':mixId' component={MixOverviewContainer} />
  <Route path=':mixId/tracks/:trackId' component={MixDetailContainer} />
</Route>
