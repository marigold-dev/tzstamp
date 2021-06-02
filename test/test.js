const path = require('path')
const fs = require('fs/promises')
const { tmpdir } = require('os')
const { randomBytes } = require('crypto')
const { Hex, blake2b } = require('@tzstamp/helpers')
const { exec } = require('child_process')
const { join } = require('path')

const SERVER_FLAG = '--servers http://localhost:8080'

void async function () {

  // Setup temp storage directory
  // This will be a folder with random suffix,
  // in the format of "tzstamp-xxxxxx" in your OS's default temp directory
  console.log('Creating temporary directory')
  const tempDir = await fs.mkdtemp(
    join(
      tmpdir(),
      'tzstamp-'
    )
  )
  console.log(`Created temporary directory at "${tempDir}"`)

  // Create and store mock files
  // Files are named "fileN.dat" and stored in the temp directory
  // Each file is 1KB of random bytes
  console.log('Generating mock files')
  const files = []
  for (let i = 0; i < 6; ++i) {
    const contents = Uint8Array.from(randomBytes(1024))
    const fileName = `file${i}.dat`
    const filePath = path.join(tempDir, fileName)

    // File entries
    files.push({
      name: fileName,
      path: filePath,
      hash: Hex.stringify(blake2b(contents)),
      contents
    })

    // Write to temp dir
    await fs.writeFile(filePath, contents)
  }

  console.log('Stamping single file')
  await execTzstamp(
    `stamp -d ${tempDir} ${SERVER_FLAG} ${files[0].path}`
  )

  console.log('Stamping single hash')
  await execTzstamp(
    `stamp -d ${tempDir} ${SERVER_FLAG} ${files[1].hash}`
  )

  console.log('Stamping multiple files and hash')
  await execTzstamp(
    `stamp -d ${tempDir} ${SERVER_FLAG} ${files[2].path} ${files[3].path} ${files[4].hash} ${files[5].hash}`
  )

  console.log('Stamping and waiting for publication')
  await execTzstamp(
    `stamp --wait -d ${tempDir} ${SERVER_FLAG} ${files[0].path}`
  )

  console.log('Verifying file against proof')
  await execTzstamp(
    `verify ${files[0].path} ${files[0].path + '.proof.json'}`
  )

  console.log('Verifying hash against proof')
  await execTzstamp(
    `verify ${files[1].hash} ${join(tempDir, files[1].hash + '.proof.json')}`
  )

  console.log('All tests passed')
  process.exit(0)

}().catch((error) => {
  console.error(error.message)
  process.exit(1)
})

function execTzstamp (args) {
  return new Promise((resolve, reject) => {
    exec(`node . ${args}`, (error, _, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve(stderr)
      }
    })
  })
}
