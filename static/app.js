import { AffixedProof, PendingProof, Proof, VerifyStatus } from "./proof.js";

let proofs = loadProofs();
let uploadedProof;

document.addEventListener("DOMContentLoaded", () => {
  initNavToggle();
  injectExternalLinkSymbols();
  initStampForm();
  initVerifyForm();
  renderProofs();
});

function loadProofs() {
  try {
    const serialized = localStorage.getItem("proofs");
    return JSON.parse(serialized) || [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function saveProofs() {
  const serialized = JSON.stringify(proofs);
  localStorage.setItem("proofs", serialized);
}

function deleteProof(url) {
  proofs = proofs.filter((p) => p && (p != url));
  saveProofs();
  const proofList = document.getElementById("proof-list");
  const proofItem = Array
    .from(proofList.children)
    .find((item) => item.dataset.url == String(url));
  if (proofItem) {
    proofList.removeChild(proofItem);
  }
}

function initNavToggle() {
  const button = document.getElementById("navtoggle");
  const items = document.getElementById("navitems");
  button.addEventListener("click", () => {
    items.classList.toggle("open");
  });
}

function injectExternalLinkSymbols() {
  const template = document.getElementById("external-link");
  document
    .querySelectorAll('a[href^="http://"], a[href^="https://"]')
    .forEach((externalLink) => {
      const icon = template.content.cloneNode(true);
      externalLink.appendChild(icon);
    });
}

function initStampForm() {
  const form = document.forms.stamp;
  form.elements["stamp-file"].addEventListener("change", handleStampFileChange);
  form.elements["stamp-hash"].addEventListener("change", updateStampButton);
  form.elements["stamp-button"].addEventListener("click", submitStamp);
}

async function handleStampFileChange() {
  const fileInput = document.getElementById("stamp-file");
  const hashInput = document.getElementById("stamp-hash");
  if (fileInput.files.length) {
    const buffer = await fileInput.files[0].arrayBuffer();
    const digest = await window.crypto.subtle.digest("SHA-256", buffer);
    const hash = Array
      .from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    hashInput.value = hash;
  }
  updateStampButton();
}

function updateStampButton() {
  const hashInput = document.getElementById("stamp-hash");
  const button = document.getElementById("stamp-button");
  button.disabled = !hashInput.checkValidity();
}

async function submitStamp() {
  const hashInput = document.getElementById("stamp-hash");
  try {
    const response = await fetch("https://api.tzstamp.io/stamp", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data: hashInput.value }),
    });
    const { url } = await response.json();
    if (proofs.includes(url)) {
      alert(
        `You have already timestamped this file hash. Download the proof here: ${url}`,
      );
    } else {
      proofs.push(url);
      saveProofs();
      renderProof(url);
    }
    document.forms.stamp.reset();
  } catch (error) {
    console.error(error);
    alert("An error occoured. The file hash could not be submitted.");
  }
}

function renderProofs() {
  for (const proof of proofs) {
    renderProof(proof);
  }
}

function renderProof(url) {
  const proofList = document.getElementById("proof-list");
  const proofItem = document.createElement("li");
  proofItem.dataset.url = url;
  proofItem.innerHTML =
    `<a href="${url}" rel="noopener noreferrer">${url}</a> `;
  const deleteButton = document.createElement("a");
  deleteButton.textContent = "(Remove)";
  deleteButton.href = "javascript:void";
  deleteButton.addEventListener("click", () => {
    if (confirm("Delete proof?")) {
      deleteProof(url);
    }
  });
  proofItem.appendChild(deleteButton);
  proofList.appendChild(proofItem);
}

function initVerifyForm() {
  const form = document.forms.verify;
  form.elements["verify-file"]
    .addEventListener(
      "change",
      handleVerifyFileChange,
    );
  form.elements["verify-hash"]
    .addEventListener("change", updateVerifyButton);
  form.elements["verify-proof"]
    .addEventListener(
      "change",
      handleVerifyProofChange,
    );
  form.elements["verify-button"]
    .addEventListener("click", submitVerify);
}

async function handleVerifyFileChange() {
  const fileInput = document.getElementById("verify-file");
  const hashInput = document.getElementById("verify-hash");
  if (fileInput.files.length) {
    const buffer = await fileInput.files[0].arrayBuffer();
    const digest = await window.crypto.subtle.digest("SHA-256", buffer);
    const hash = Array
      .from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    hashInput.value = hash;
  }
  updateVerifyButton();
}

function updateVerifyButton() {
  const hashInput = document.getElementById("verify-hash");
  const button = document.getElementById("verify-button");
  button.disabled = !hashInput.checkValidity() ||
    !uploadedProof;
}

async function handleVerifyProofChange() {
  const proofInput = document.getElementById("verify-proof");
  if (proofInput.files.length) {
    const text = await proofInput.files[0].text();
    try {
      const template = JSON.parse(text);
      uploadedProof = Proof.from(template);
    } catch (error) {
      uploadedProof = undefined;
      proofInput.value = null;
      console.error(error);
      alert("Count not parse proof.");
    }
  }
  while (uploadedProof instanceof PendingProof) {
    try {
      uploadedProof = uploadedProof.resolve();
    } catch (error) {
      uploadedProof = undefined;
      proofInput.value = null;
      console.error(error);
      alert("Can not resolve pending proof.");
    }
  }
  if (uploadedProof && !(uploadedProof instanceof AffixedProof)) {
    uploadedProof = undefined;
    proofInput.value = null;
    alert("Can not load incomplete proof.");
  }
  if (uploadedProof && !uploadedProof.mainnet) {
    alert(
      `Caution: the proof is affixed to the alternative Tezos network "${uploadedProof.network}". It might not be trustworthy.`,
    );
  }
  updateVerifyButton();
}

function hexString(array) {
  return Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function submitVerify() {
  const hashInput = document.getElementById("verify-hash");
  const status = await uploadedProof.verify(
    "https://mainnet-tezos.giganode.io/",
  );
  if (hashInput.value != hexString(uploadedProof.hash)) {
    console.debug(hashInput.value);
    console.debug(hexString(uploadedProof.hash));
    alert("Can not verify proof: Proof does not correspond to hash!");
    return;
  }
  switch (status) {
    case VerifyStatus.Verified:
      alert(
        `Verified!\nHash existed at ${uploadedProof.timestamp.toLocaleString()}\nBlock hash: ${uploadedProof.blockHash}`,
      );
      break;
    case VerifyStatus.NetError:
      alert("Can not verify proof: a network error occurred.");
      break;
    case VerifyStatus.NotFound:
      alert(
        "Can not verify proof: the block hash asserted by the proof was not found.",
      );
      break;
    case VerifyStatus.Mismatch:
      alert(
        "Can not verify proof: the asserted timestamp does not match the on-chain timestamp.",
      );
  }
  document.forms.verify.reset();
}
