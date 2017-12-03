exports.handler = (event, context, callback) => {
  const slackWebhook = process.env.SLACK_WEBHOOK
  if (!slackWebhook) return callback(`SLACK_WEBHOOK is not set`)

  console.log(JSON.stringify(event))
  const msg = buildSlackMessage(event)

  postJSON(slackWebhook, msg)
    .then(_ => 'Success')
    .then(status => callback(null, status))
    .catch(err => callback(err))
}

function buildSlackMessage(body) {
  const msg = {
    attachments: [
      {
        fallback: '',
        color: 'good',
        title: 'Purchase complete',
        author_name: 'FastSpring',
        author_icon:
          'https://fastspring.com/wp/wp-content/uploads/2016/09/android-chrome-192x192.png',
        fields: createFields(body)
      }
    ]
  }

  return msg
}

function createFields(body) {
  const customer = body.customer || {}

  return [
    {
      title: `${customer.first} ${customer.last}`,
      value: `${customer.email}`,
      short: true
    }
  ].concat(
    body.items.map(item => {
      const quantity = item.quantity > 1 ? ` (x${item.quantity})` : ''
      return {
        title: `${item.display}${quantity}`,
        value: formatCurrency(item.subtotalInPayoutCurrencyDisplay),
        short: true
      }
    })
  )
}

function postJSON(url, data) {
  // Coerce data into a string if needed
  if (data instanceof Buffer) data = data.toString()
  else if (typeof data !== 'string') data = JSON.stringify(data)

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

function formatCurrency(value) {
  return (value || '?').replace('USD ', '$')
}
