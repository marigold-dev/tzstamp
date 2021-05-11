import { Proof } from "./proof.js";

let proofs = loadProofs();

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
    .find(item => item.dataset.url == String(url))
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
      alert(`You have already timestamped this file hash. Download the proof here: ${url}`);
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
  proofItem.innerHTML = `<a href="${url}" rel="noopener noreferrer">${url}</a> `
  const deleteButton = document.createElement("a");
  deleteButton.textContent = "(Remove)";
  deleteButton.href = "javascript:void";
  deleteButton.addEventListener("click", () => {
    if(confirm("Delete proof?")) {
      deleteProof(url);
    }
  })
  proofItem.appendChild(deleteButton);
  proofList.appendChild(proofItem);
}

function initVerifyForm() {
  // const form = document.forms.verify;
  // form.elements["verify-file"].addEventListener("change", handleVerifyFileChange);
  // form.elements["verify-hash"].addEventListener("change", updateVerifyButton);
  // form.elements["verify-proof"].addEventListener("change", handleVerifyProofChange);
  // form.elements["verify-button"].addEventListener("click", submitVerify);
}
