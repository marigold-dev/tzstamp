const modules = new Map([
  [ 'help', () => require('./help') ],
  [ 'version', () => require('./version') ],
  [ 'stamp', () => require('./stamp') ],
  [ 'verify', () => require('./verify') ],
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
