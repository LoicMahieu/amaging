
const {httpError} = require('../lib/utils')
const async = require('async')

const debug = require('debug')('amaging:writer:default')

module.exports = () =>
  function (req, res, next) {
    const { amaging } = req

    // Valid headers
    const contentLength = req.headers['content-length']
    const contentType = req.headers['content-type']

    debug('Start default writer with %j', {
      contentLength,
      contentType
    }
    )

    // Set `action` to policy for allow action restriction
    amaging.policy.set('action',
      amaging.file.exists()
        ? 'update'
      : 'create'
    )

    if (contentType.match(/^multipart\/form-data/)) {
      return next()
    }

    if (!contentLength || !contentType) {
      debug('Abort default writer due to missing headers')
      return next(httpError(403, 'Missing header(s)'))
    }

    debug('Start rewriting file...')

    let stream = null
    return async.series([
      function (done) {
        debug('Request write stream.')
        return amaging.file.requestWriteStream({
          ContentLength: contentLength,
          ContentType: contentType
        }
        , function (err, _stream) {
          stream = _stream
          return done(err)
        })
      },
      function (done) {
        debug('Pipe in stream.')
        stream.on('close', done)
        stream.on('error', done)
        return req.pipe(stream)
      },
      function (done) {
        debug('Read info.')
        return amaging.file.readInfo(done)
      }
    ], function (err) {
      if (err) { return next(err) }

      debug('End default writer.')

      return res.send({
        success: true,
        file: amaging.file.info
      })
    })
  }
