import { Blake2bOperation, Proof, Sha256Operation } from "./proof.js";

const AGGREGATOR_URL = "https://api.tzstamp.io";
const RPC_URL = "https://mainnet-tezos.giganode.io";

let proof = null;

const {
  file: fileInput,
  hash: hashInput,
  proof: proofInput,
  stamp: stampButton,
  verify: verifyButton,
  clear: clearButton,
  display: displayOutput,
} = document.forms.app;

fileInput.addEventListener("change", async () => {
  displayOutput.value = "";
  if (fileInput.files.length) {
    disableButtons();
    hashInput.disabled = true;
    const buffer = await fileInput.files[0].arrayBuffer();
    const digest = await window.crypto.subtle.digest("SHA-256", buffer);
    const hash = stringifyHex(new Uint8Array(digest));
    hashInput.value = hash;
    hashInput.disabled = false;
  }
  updateButtons();
});

hashInput.addEventListener("input", () => {
  displayOutput.value = "";
  fileInput.value = null;
  updateButtons();
});

proofInput.addEventListener("change", async () => {
  proof = null;
  displayOutput.value = "";
  if (proofInput.files.length) {
    const proofFile = proofInput.files[0];
    if (proofFile.type != "application/json") {
      proofInput.value = null;
      displayOutput.value = "Not a timestamp proof file";
    }
    try {
      const proofText = await proofFile.text();
      const proofJSON = JSON.parse(proofText);
      proof = Proof.from(proofJSON);
    } catch (error) {
      displayOutput.value = "Invalid timestamp proof";
    }
  }
  updateButtons();
});

function disableButtons() {
  stampButton.disabled = true;
  verifyButton.disabled = true;
  clearButton.disabled = true;
}

function updateButtons() {
  stampButton.disabled = !hashInput.value.length || !hashInput.checkValidity();
  verifyButton.disabled = !hashInput.value.length || !proof;
  clearButton.disabled = !hashInput.value.length && !proofInput.files.length;
}

stampButton.addEventListener("click", async () => {
  displayOutput.value = "";
  disableButtons();
  const proof1 = Proof.create({
    hash: parseHex(hashInput.value),
    operations: [
      new Blake2bOperation(
        32,
        crypto.getRandomValues(new Uint8Array(32)),
      ),
    ],
  });
  const response = await fetch(AGGREGATOR_URL + "/stamp", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: stringifyHex(proof1.derivation),
    }),
  }).catch((error) => {
    displayOutput.value = "Network error: " + error.message;
  });
  if (response && response.status == 202) {
    const json = await response.json();
    const proof2 = Proof.create({
      hash: proof1.derivation,
      operations: [],
      remote: json.url,
    });
    const localProof = proof1.concat(proof2);
    downloadProof(localProof, getFileName() + "_partial-proof.json");
    displayOutput.value = "Downloaded proof";
  } else {
    displayOutput.value = `${response.status} ${response.statusText}`;
  }
  updateButtons();
});

verifyButton.addEventListener("click", async () => {
  const input = parseHex(hashInput.value);
  if (!compare(proof.hash, input)) {
    displayOutput.value =
      "The input hash does not match the timestamp proof's hash";
    return;
  }
  displayOutput.value = "";
  disableButtons();
  let resolveFlag = false;
  try {
    for (let i = 0; i < 4 && proof.isUnresolved(); ++i) {
      resolveFlag = true;
      proof = await proof.resolve();
    }
  } catch (error) {
    displayOutput.value = `Error resolving proof: ${error.message}`;
    updateButtons();
    return;
  }
  if (proof.isAffixed()) {
    const result = await proof.verify(RPC_URL);
    if (!proof.mainnet) {
      displayOutput.value =
        `Caution! The timestamp proof is affixed to an alternative network "${proof.network}". It might not be trustworthy.\n\n`;
    }
    if (result.verified) {
      displayOutput.value += "Verified!\n" +
        `Hash existed at ${proof.timestamp.toLocaleString()}\n` +
        `Block hash: ${proof.blockHash}`;
    } else {
      displayOutput.value += "Could not verify timestamp proof.\n" +
        result.message;
      resolveFlag = false;
    }
  } else {
    displayOutput.value =
      "Timestamp proof is unaffixed to a blockchain and cannot be verified";
  }
  if (resolveFlag) {
    downloadProof(proof, getFileName() + "_proof.json");
  }
  updateButtons();
});

clearButton.addEventListener("click", () => {
  document.forms.app.reset();
  updateButtons();
});

function parseHex(string) {
  const byteCount = Math.ceil(string.length / 2);
  const bytes = new Uint8Array(byteCount);
  for (let index = 0; index < string.length / 2; ++index) {
    const offset = index * 2 - string.length % 2;
    const hexByte = string.substring(offset, offset + 2);
    bytes[index] = parseInt(hexByte, 16);
  }
  return bytes;
}

function stringifyHex(bytes) {
  return Array
    .from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getFileName() {
  return fileInput.files.length ? fileInput.files[0].name : hashInput.value;
}

function downloadProof(proof, fileName) {
  const file = new Blob(
    [JSON.stringify(proof)],
    { type: "application/json" },
  );
  const a = document.createElement("a");
  const url = URL.createObjectURL(file);
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
}

function compare(a, b) {
  if (a.length != b.length) return false;
  for (let i in a) {
    if (a[i] != b[i]) return false;
  }
  return true;
}
