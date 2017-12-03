exports.handler = (event, context, callback) => {
  const slackWebhook = process.env.SLACK_WEBHOOK
  if (!slackWebhook) return callback(`SLACK_WEBHOOK is not set`)

  let body
  try {
    body = JSON.parse(event.body)
    if (!body || !Array.isArray(body.items))
      return callback(`Unrecognized request body: Event: ${str(event)}`)
  } catch (ex) {
    return callback(
      `Failed to parse request body. Error: ${ex}, Event: ${str(event)}`
    )
  }

  buildSlackMessage(body)
    .then(msg => postJSON(slackWebhook, msg))
    .then(_ => 'Success')
    .then(status => callback(null, status))
    .catch(err => callback(err))
}

function buildSlackMessage(body) {
  const msg = {
    attachments: [
      {
        fallback: 'Purchase complete',
        color: 'good',
        pretext: 'Purchase complete',
        title: 'Summary',
        author_name: 'FastSpring',
        author_icon:
          'https://fastspring.com/wp/wp-content/uploads/2016/09/android-chrome-192x192.png',
        fields: createFields(body.items)
      }
    ]
  }

  return msg
}

function createFields(body) {
  const customer = body.customer || {}

  return [
    {
      title: 'Customer',
      value: `${customer.first} ${customer.last} (${customer.email})`,
      short: true
    },
    {
      title: 'Revenue',
      value: body.totalInPayoutCurrencyDisplay,
      short: true
    }
  ].concat(
    body.items.map(item => {
      return {
        title: `${item.display} (x${item.quantity})`,
        value: item.subtotalInPayoutCurrencyDisplay || '?',
        short: true
      }
    })
  )
}

function postJSON(url, data) {
  // Coerce data into a string if needed
  if (data instanceof Buffer) data = data.toString()
  else if (typeof data !== 'string') data = str(data)

  const urlParts = require('url').parse(url)
  const isHTTPS = urlParts.protocol === 'https:'
  const options = {
    hostname: urlParts.hostname,
    port: urlParts.port || (isHTTPS ? 443 : 80),
    path: urlParts.path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }

  return new Promise((resolve, reject) => {
    const req = require(isHTTPS ? 'https' : 'http').request(options, res => {
      let resBody = ''
      res.setEncoding('utf8')
      res.on('data', chunk => (resBody += chunk.toString()))
      res.on('end', () => resolve(res, resBody))
    })

    req.on('error', err => reject(err))
    req.write(data)
    req.end()
  })
}

function str(obj) {
  return JSON.stringify(obj)
}
