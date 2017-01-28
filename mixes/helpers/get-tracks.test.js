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

      id: 1,
      type: 'primary-track',

      startBeat: 90,
      beatCount: 100,

      clips: [{
        id: 'track2',
        sampleId: 'track-2.m4a'
      }]

    }, {
      id: 2,
      type: 'transition',

      startBeat: 90,
      beatCount: 20,

      channels: [{
        id: 3,
        type: 'sample-track',

        startBeat: 5,
        beatCount: 10,

        clips: [{
          id: 'beat',
          sampleId: 'beat.m4a'
        }]
      }]

    }, {
      id: 4,
      type: 'primary-track',

      startBeat: 0,
      beatCount: 100,

      clips: [{
        id: 'track1',
        sampleId: 'track-1.m4a'
      }]
    }]
  }

  const expected = [{
    id: 'track-1.m4a',
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

      clips: [{
        id: 'track1',
        sampleId: 'track-1.m4a'
      }]
    }
  }, {
    id: 'track-2.m4a',
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
    }
  }]

  const actual = getPrimaryTracks(nestedChannel, metas)
  t.deepEqual(actual, expected)
})
