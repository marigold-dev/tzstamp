const modules = new Map([
  [ 'help', () => require('./help') ],
  [ 'version', () => require('./version') ],
  [ 'stamp', () => require('./stamp') ],
  [ 'verify', () => require('./verify') ],
  [ 'manual-verify', () => require('./manual_verify') ],
  [ 'derive', () => require('./derive') ]
])

function resolveModule (subcommand) {
  const mod = modules.get(subcommand)
  if (!mod) {
    return null
  }
  return mod()
}

module.exports = {
  modules,
  resolveModule
}
