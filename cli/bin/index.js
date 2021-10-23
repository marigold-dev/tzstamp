#!/usr/bin/env node

const parseArgs = require('minimist')
const { resolveModule } = require('../src/resolve_module')
const Help = require('../src/help')
const Version = require('../src/version')

const globalParseOptions = {
  boolean: [
    'help',
    'version',
    'verbose'
  ],
  alias: {
    help: 'h',
    version: 'v',
    verbose: 'V'
  },
  stopEarly: true
}

const { _: subArgv, ...options } = parseArgs(process.argv.slice(2), globalParseOptions)

void async function () {
  // Early exits
  if (options.help) {
    await Help.handler({ _: [] }, true)
  }
  if (options.version) {
    await Version.handler({ _: [] })
  }

  // Subcommand delegation
  const subcommand = subArgv[0]
  const mod = resolveModule(subcommand)
  if (!mod) {
    await Help.handler({ _: [ subcommand ] }, true)
  }
  const parseOptions = mod.parseOptions || {}
  parseOptions.stopEarly = true
  if (parseOptions.boolean == undefined) {
    parseOptions.boolean = []
  }
  parseOptions.boolean.push('help', 'verbose')
  if (parseOptions.alias == undefined) {
    parseOptions.alias = {}
  }
  parseOptions.alias.help = 'h'
  parseOptions.alias.verbose = 'V'
  const subOptions = parseArgs(subArgv.slice(1), parseOptions)
  subOptions.verbose = subOptions.verbose || options.verbose
  if (subOptions.help) {
    await Help.handler({ _: [ subcommand ] })
  }
  await mod.handler(subOptions)
}().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
