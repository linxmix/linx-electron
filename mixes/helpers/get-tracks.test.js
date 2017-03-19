const test = require('ava')

const { getPrimaryTracks } = require('./get-tracks')

test('getPrimaryTracks', (t) => {
  const metas = {
    'track-1.m4a': {
      id: 'track-1.m4a',
      title: 'track-1'
    },
    'track-2.m4a': {
      id: 'track-2.m4a',
      title: 'track-2'
    },
    'beat.m4a': {
      id: 'beat.m4a',
      title: 'beat'
    }
  }

  const nestedChannel = {
    id: 0,
    channels: [{
      id: 4,
      type: 'primary-track',

      startBeat: 0,
      beatCount: 100,

      clips: [{
        id: 'track1',
        sampleId: 'track-1.m4a'
      }],

      channels: [{
        id: 2,
        type: 'transition',
        startBeat: 90
      }]
    }, {

      id: 1,
      type: 'primary-track',

      startBeat: 90,
      beatCount: 100,

      clips: [{
        id: 'track2',
        sampleId: 'track-2.m4a'
      }]
    }]
  }

  const expected = [{
    id: 4,
    index: 0,
    meta: {
      id: 'track-1.m4a',
      title: 'track-1'
    },
    channel: {
      id: 4,
      type: 'primary-track',
      startBeat: 0,
      beatCount: 100,

      channels: [{
        id: 2,
        type: 'transition',
        startBeat: 90
      }],

      clips: [{
        id: 'track1',
        sampleId: 'track-1.m4a'
      }]
    },
    transition: {
      id: 2,
      type: 'transition',
      startBeat: 90
    }
  }, {
    id: 1,
    index: 1,
    meta: {
      id: 'track-2.m4a',
      title: 'track-2'
    },
    channel: {
      id: 1,
      type: 'primary-track',
      startBeat: 90,
      beatCount: 100,

      clips: [{
        id: 'track2',
        sampleId: 'track-2.m4a'
      }]
    },
    transition: undefined
  }]

  const actual = getPrimaryTracks(nestedChannel, metas)
  t.deepEqual(actual, expected)
})
