require('dotenv-defaults').config()
const { PORT, INTERVAL } = process.env

const express = require('express')
const app = express()

app.post('/add_hash', (req, res) => {
	// TODO
	console.log(req)
})

app.get('/verify', (req, res) => {
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
