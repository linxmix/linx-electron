const React = require('react')
const { Route, IndexRoute } = require('react-router')

const SampleListContainer = require('./containers/sample-list')
const SampleContainer = require('./containers/sample')

module.exports = <Route path='/samples'>
  <IndexRoute component={SampleListContainer} />
  <Route path=':sampleId' component={SampleContainer} />
</Route>
