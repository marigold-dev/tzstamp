const submissionInput = document.getElementById('submission')
const timestampButton = document.getElementById('timestamp')
const verifyButton = document.getElementById('verify')
const hashDisplay = document.getElementById('hash')

submissionInput.addEventListener('change', handleFileSelection)
timestampButton.addEventListener('click', handleTimestampAction)
verifyButton.addEventListener('click', handleVerifyAction)

let hash = null

async function handleFileSelection ({ target }) {
  timestampButton.disabled = true
  verifyButton.disabled = true
  if (target.files.length) {
    hashDisplay.innerText = 'Pending'
    const buffer = await target.files[0].arrayBuffer()
    hash = await window.crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hash))
    hashDisplay.innerText = hashArray
      .map(b => b.toString(16)
      .padStart(2, '0'))
      .join('')
    timestampButton.disabled = false
    verifyButton.disabled = false
  } else {
    hashDisplay.innerText = '—'
  }
}

async function handleTimestampAction ({ target }) {
  await fetch('/add_hash', {
    method: 'POST',
    body: hash
  })
}

async function handleVerifyAction ({ target }) {
  await fetch('/verify', {
    method: 'GET',
    body: hash
  })
}
