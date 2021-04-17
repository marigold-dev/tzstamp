const form = document.forms.timestamp
const {
  file: fileInput,
  hash: hashInput,
  stamp: stampButton,
  verify: verifyButton
} = form.elements

fileInput.addEventListener('change', async () => {
  if (fileInput.files.length) {
    const buffer = await fileInput.files[0].arrayBuffer()
    const digest = await window.crypto.subtle.digest('SHA-256', buffer)
    const hash = Array
      .from(new Uint8Array(digest))
      .map(b => b.toString(16)
      .padStart(2, '0'))
      .join('')
    hashInput.value = hash
  }
  updateActions()
})

hashInput.addEventListener('change', ({ target }) => {
  updateActions()
})

stampButton.addEventListener('click', () => {
  fileInput.value = null
  fetch('/api/stamp', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ hash: hashInput.value })
  })
    .then(res => res.json())
    .then(json => {
          proofs = document.getElementById("proof-urls")
          if (document.getElementById("no-stamps")) {
              const noStampsMsg = document.getElementById("no-stamps")
              noStampsMsg.remove()
          }
          var proofLink = document.createElement("a")
          proofLink.href = json.url
          proofLink.target = "_blank"
          var proofLinkText = document.createTextNode(json.url)
          proofLink.appendChild(proofLinkText)
          proofs.appendChild(proofLink)
         })
  form.reset()
})

verifyButton.addEventListener('click', () => {
  /* fetch('/api/proof', {
    method: 'GET'
  })
    .then(res => res.json())
    .then(console.log)
  */
  window.open("https://gitlab.com/tzstamp/cli#how-to-verify-an-inclusion-proof-on-debian-106",
              "_blank")
  form.reset()
})

function updateActions () {
  stampButton.disabled = !hashInput.checkValidity()
  verifyButton.disabled = !hashInput.checkValidity()
}
