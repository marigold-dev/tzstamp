require('dotenv-defaults').config()
const { PORT, INTERVAL } = process.env

const express = require('express')
const app = express()
const bodyParser = require('body-parser')

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.post('/api/add_hash', (req, res) => {
    // TODO
    if (req.body.h.length !== 64) {
        res.send('{"error":"You didn\'t submit a sha256 hash."}');
    }
    else {
        // TODO: This is where the addition to the Merkle tree goes
        res.send('{"url":"test"}');
    }
})

app.get('/api/verify', (req, res) => {
  // TODO
  console.log(req)
})

app.use(express.static('static'))

app.listen(PORT, () => {
  console.log(`Serving on port ${PORT}`)
})

setInterval(() => {
  // TODO
}, INTERVAL)
