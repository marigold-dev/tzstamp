/**
 * Parse and normalize body data
 */
exports.parseBody = async function (ctx, next) {
  if (ctx.method == 'POST') {

    // Require Content-Length header
    if (ctx.request.length == undefined) {
      ctx.throw(411, 'Content length is not defined')
    }

    // Limit length to 1KB
    if (ctx.request.length > 1024) {
      ctx.throw(413, 'Content body must be less than 1KB')
    }

    // Read and decode body
    const rawBody = await readStream(ctx.req, ctx.request.length)
    const textBody = new TextDecoder('utf-8').decode(rawBody)

    switch (ctx.request.type) {

      // Parse JSON body
      case 'application/json':
        try {
          const data = JSON.parse(textBody)
          if (data instanceof Object) {
            ctx.request.body = data
          } else {
            ctx.throw(400, 'JSON root element must be object or array')
          }
        } catch (_) {
          ctx.throw(400, 'JSON syntax error')
        }
        break

      // Parse URL-encoded form body
      case 'application/x-www-form-urlencoded': {
        const params = new URLSearchParams(textBody)
        const data = {}
        for (const [ key, value ] of params.entries()) {
          data[key] = value
        }
        ctx.request.body = data
        break
      }

      // Unsupported content type
      default:
        ctx.throw(415, 'Content type is unsupported')
    }
  }

  await next()
}

/**
 * Read stream into byte array
 */
function readStream (stream, length) {
  return new Promise((resolve, reject) => {
    const buffer = new Uint8Array(length)
    let index = 0

    // Read data into buffer
    stream.on('data', chunk => {
      buffer.set(chunk, index)
      index += chunk.length
    })

    // Reject on error
    stream.on('error', error => {
      reject(error)
    })

    // Resolve on stream end
    stream.on('end', () => {
      resolve(buffer)
    })
  })
}
