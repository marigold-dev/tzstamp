const { version, description: packageDesc } = require('../package.json')
const { modules, resolveModule } = require('./resolve_module')
const chalk = require('chalk')
const Version = require('./version')

const INDENT = '  '
const SPACER = 20

const description = 'Prints command usage.'

// Global command usage
const globalHelp = {
  title: `TzStamp CLI ${version}`,
  description: packageDesc,
  usage: 'tzstamp [global options] <command> [command options]',
  remarks: [ 'Use "tzstamp help <command>" for detailed command usage.' ],
  options: [
    [ '--help, -h', description ],
    [ '--version, -v', Version.description ],
    [ '--verbose, -V', 'Logs extra messages.' ],
    [ '--no-color', 'Disables color output.' ]
  ],
  get examples () {
    const result = []
    for (const [ subcommand, resolver ] of modules.entries()) {
      result.push(subcommand + ' '.repeat(SPACER - subcommand.length) + resolver().description)
    }
    return result
  },
  footer:
    'Copyright (c) 2021 John David Pressman, Benjamin Herman\n' +
    'For use under the MIT License\n' +
    'Source: <https://github.com/marigold-dev/tzstamp/tree/main/cli>'
}

async function handler (options, printGlobalHelp = false) {
  const query = options._[0]
  let mod
  if (!query) {
    mod = globalHelp
  } else if (printGlobalHelp) {
    if (query) {
      console.log(`Unrecognized subcommand "${query}".`)
    }
    mod = globalHelp
  } else {
    mod = resolveModule(query)
  }
  console.log('\n' + chalk.bold(mod.title) + ' - ' + mod.description)
  if (mod.usage) {
    console.log('\n' + chalk.underline`Usage:`)
    console.log(INDENT + mod.usage)
  }
  if (mod.remarks) {
    for (const remark of mod.remarks) {
      console.log('\n' + remark)
    }
  }
  if (mod.options) {
    console.log('\n' + chalk.underline(mod == globalHelp ? 'Global options:' : 'Options:'))
    for (const [ key, description ] of mod.options) {
      console.log(INDENT + key + ' '.repeat(20 - key.length) + description)
    }
  }
  if (mod.examples) {
    console.log('\n' + chalk.underline(mod == globalHelp ? 'Commands:' : 'Examples:'))
    for (const example of mod.examples) {
      console.log(INDENT + example)
    }
  }
  console.log()
  if (mod.footer) {
    console.log(mod.footer)
  }
  process.exit(2)
}

module.exports = {
  handler,
  title: 'Help',
  description,
  usage: 'tzstamp help [command]'
}
