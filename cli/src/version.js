const { version } = require('../package.json')

async function handler () {
  console.log(`TzStamp CLI ${version}`)
  process.exit(2)
}

module.exports = {
  handler,
  title: 'Version',
  description: 'Prints the installed version.',
  usage: 'tzstamp version'
}
