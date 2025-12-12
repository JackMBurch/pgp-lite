// Extremely simple client-side PGP encryptor using OpenPGP.js
// All operations happen in the browser; no data is sent to a server.

let defaultPublicKeyArmored = "";
let uploadedPublicKeyArmored = "";
let uploadedPrivateKeyArmored = "";

const PASSPHRASE_STORAGE_KEY = "pgpLitePrivatePassphrase";

function setStatus(message, kind) {
  const statusElement = document.getElementById("statusMessage");
  statusElement.textContent = message;
  statusElement.classList.remove("status--ok", "status--error");
  if (kind === "ok") {
    statusElement.classList.add("status--ok");
  } else if (kind === "error") {
    statusElement.classList.add("status--error");
  }
}

async function handleKeyUpload(event) {
  const input = event.target;
  const infoElement = document.getElementById("uploadedKeyInfo");

  if (!input.files || input.files.length === 0) {
    uploadedPublicKeyArmored = "";
    infoElement.textContent = "No key uploaded yet.";
    return;
  }

  const file = input.files[0];

  try {
    const text = await file.text();
    if (!text.includes("BEGIN PGP PUBLIC KEY BLOCK")) {
      uploadedPublicKeyArmored = "";
      infoElement.textContent = "File does not look like a PGP public key.";
      return;
    }
    uploadedPublicKeyArmored = text;
    infoElement.textContent = `Loaded key from: ${file.name}`;
  } catch (error) {
    uploadedPublicKeyArmored = "";
    infoElement.textContent = "Failed to read key file.";
  }
}

async function handlePrivateKeyUpload(event) {
  const input = event.target;
  const infoElement = document.getElementById("uploadedPrivateKeyInfo");

  if (!input.files || input.files.length === 0) {
    uploadedPrivateKeyArmored = "";
    infoElement.textContent = "No private key uploaded yet.";
    return;
  }

  const file = input.files[0];

  try {
    const text = await file.text();
    if (!text.includes("BEGIN PGP PRIVATE KEY BLOCK")) {
      uploadedPrivateKeyArmored = "";
      infoElement.textContent = "File does not look like a PGP private key.";
      return;
    }
    uploadedPrivateKeyArmored = text;
    infoElement.textContent = `Loaded private key from: ${file.name}`;
  } catch (error) {
    uploadedPrivateKeyArmored = "";
    infoElement.textContent = "Failed to read private key file.";
  }
}

async function encryptCurrentText() {
  if (typeof window.openpgp === "undefined") {
    setStatus("OpenPGP.js failed to load.", "error");
    return;
  }

  const plaintextElement = document.getElementById("plaintextInput");
  const keyModeSelect = document.getElementById("keyModeSelect");

  const plaintext = plaintextElement.value;
  if (!plaintext.trim()) {
    setStatus("Please enter some text to encrypt.", "error");
    return;
  }

  const useUploaded = keyModeSelect.value === "uploaded";
  let armoredKey = "";

  if (useUploaded) {
    if (!uploadedPublicKeyArmored) {
      setStatus(
        "You selected a public key file, but none is selected yet.",
        "error",
      );
      return;
    }
    armoredKey = uploadedPublicKeyArmored;
  } else {
    if (!defaultPublicKeyArmored) {
      setStatus(
        "No default public key is loaded. Select a public key file instead.",
        "error",
      );
      return;
    }
    armoredKey = defaultPublicKeyArmored;
  }

  setStatus("Encrypting...", "");

  try {
    const publicKey = await window.openpgp.readKey({ armoredKey });
    const message = await window.openpgp.createMessage({ text: plaintext });
    const encrypted = await window.openpgp.encrypt({
      message,
      encryptionKeys: publicKey,
    });

    plaintextElement.value = encrypted;
    setStatus("Encryption complete.", "ok");
    updateActionButtonsBasedOnText();
  } catch (error) {
    setStatus("Failed to encrypt. Check that the public key is valid.", "error");
  }
}

async function decryptCurrentText() {
  if (typeof window.openpgp === "undefined") {
    setStatus("OpenPGP.js failed to load.", "error");
    return;
  }

  const textElement = document.getElementById("plaintextInput");
  const passphraseElement = document.getElementById("privateKeyPassphrase");

  const ciphertext = textElement.value;
  if (!ciphertext.trim()) {
    setStatus("Please paste an encrypted PGP message to decrypt.", "error");
    return;
  }

  if (!uploadedPrivateKeyArmored) {
    setStatus("Select a private key file before decrypting.", "error");
    return;
  }

  setStatus("Decrypting...", "");

  try {
    const privateKey = await window.openpgp.readPrivateKey({
      armoredKey: uploadedPrivateKeyArmored,
    });
    const passphrase = passphraseElement.value;

    let decryptionKey = privateKey;

    if (passphrase.trim()) {
      try {
        decryptionKey = await window.openpgp.decryptKey({
          privateKey,
          passphrase,
        });
      } catch (error) {
        setStatus("Failed to unlock private key. Check your passphrase.", "error");
        return;
      }
    }

    const message = await window.openpgp.readMessage({
      armoredMessage: ciphertext,
    });

    const decrypted = await window.openpgp.decrypt({
      message,
      decryptionKeys: decryptionKey,
    });

    textElement.value = decrypted.data;
    setStatus("Decryption complete.", "ok");
    updateActionButtonsBasedOnText();
  } catch (error) {
    setStatus(
      "Failed to decrypt. Check that the private key, passphrase, and message match.",
      "error",
    );
  }
}

async function copyCiphertext() {
  const textElement = document.getElementById("plaintextInput");
  const value = textElement.value;
  if (!value.trim()) {
    setStatus("Nothing to copy yet.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
    setStatus("Text copied to clipboard.", "ok");
  } catch (error) {
    setStatus("Could not access clipboard. Copy manually.", "error");
  }
}

function sanitizeForFilename(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "key";
  }
  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "application/pgp-keys" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

async function generateAndDownloadKeypair() {
  const statusElement = document.getElementById("keyGenStatus");
  const setKeyGenStatus = (message, kind) => {
    if (!statusElement) {
      return;
    }
    statusElement.textContent = message;
    statusElement.classList.remove("status--ok", "status--error");
    if (kind === "ok") {
      statusElement.classList.add("status--ok");
    } else if (kind === "error") {
      statusElement.classList.add("status--error");
    }
  };

  if (typeof window.openpgp === "undefined") {
    setKeyGenStatus("OpenPGP.js failed to load.", "error");
    return;
  }

  const nameInput = document.getElementById("keyGenName");
  const emailInput = document.getElementById("keyGenEmail");
  const passphraseInput = document.getElementById("keyGenPassphrase");

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const passphrase = passphraseInput.value;

  if (!name && !email) {
    setKeyGenStatus("Enter a name or email to generate a keypair.", "error");
    return;
  }

  setKeyGenStatus("Generating keypair...", "");

  try {
    const userIDs =
      name || email
        ? [
            {
              name: name || undefined,
              email: email || undefined,
            },
          ]
        : [];

    const generated = await window.openpgp.generateKey({
      type: "rsa",
      rsaBits: 4096,
      userIDs,
      passphrase: passphrase || undefined,
    });

    const baseName = sanitizeForFilename(email || name || "key");

    downloadTextFile(`${baseName}-public.asc`, generated.publicKey);
    downloadTextFile(`${baseName}-private.asc`, generated.privateKey);

    setKeyGenStatus("Keypair generated and downloads started.", "ok");
  } catch (error) {
    setKeyGenStatus("Failed to generate keypair.", "error");
  }
}

function syncStoredPassphrase() {
  const passphraseElement = document.getElementById("privateKeyPassphrase");
  const rememberCheckbox = document.getElementById("rememberPassphraseCheckbox");

  if (!passphraseElement || !rememberCheckbox) {
    return;
  }

  try {
    if (rememberCheckbox.checked && passphraseElement.value) {
      window.localStorage.setItem(
        PASSPHRASE_STORAGE_KEY,
        passphraseElement.value,
      );
    } else {
      window.localStorage.removeItem(PASSPHRASE_STORAGE_KEY);
    }
  } catch (error) {
    // Ignore localStorage errors (e.g., disabled or unavailable).
  }
}

function isLikelyPgpMessage(text) {
  if (!text) {
    return false;
  }
  const trimmedStart = text.replace(/^\s+/, "");
  return trimmedStart.startsWith("-----BEGIN PGP") && trimmedStart.includes("-----END PGP");
}

function updateActionButtonsBasedOnText() {
  const plaintextElement = document.getElementById("plaintextInput");
  const actionButton = document.getElementById("actionButton");
  const copyButton = document.getElementById("copyButton");

  if (!plaintextElement || !actionButton) {
    return;
  }

  const text = plaintextElement.value;
  const looksLikePgp = isLikelyPgpMessage(text);

  if (looksLikePgp) {
    actionButton.textContent = "Decrypt";
    actionButton.classList.add("button--primary");
    actionButton.classList.remove("button--ghost");
    if (copyButton) {
      copyButton.textContent = "Copy text";
    }
  } else {
    actionButton.textContent = "Encrypt";
    actionButton.classList.add("button--primary");
    actionButton.classList.remove("button--ghost");
    if (copyButton) {
      copyButton.textContent = "Copy text";
    }
  }
}

async function loadDefaultPublicKey() {
  try {
    const response = await fetch("default-public-key.asc", {
      cache: "no-store",
    });
    if (!response.ok) {
      setStatus(
        "No default public key file found. Select a public key file instead.",
        "error",
      );
      return;
    }
    const text = await response.text();
    if (!text.includes("BEGIN PGP PUBLIC KEY BLOCK")) {
      setStatus(
        "Default public key file is not a valid PGP public key.",
        "error",
      );
      return;
    }
    defaultPublicKeyArmored = text;
    const previewElement = document.getElementById("defaultKeyPreview");
    if (previewElement) {
      previewElement.textContent = defaultPublicKeyArmored;
    }
  } catch (error) {
    setStatus(
      "Could not load default public key file. Select a public key file instead.",
      "error",
    );
  }
}

function wireUpEvents() {
  const fileInput = document.getElementById("publicKeyFile");
  const privateKeyFileInput = document.getElementById("privateKeyFile");
  const actionButton = document.getElementById("actionButton");
  const copyButton = document.getElementById("copyButton");
  const plaintextElement = document.getElementById("plaintextInput");
  const passphraseElement = document.getElementById("privateKeyPassphrase");
  const rememberCheckbox = document.getElementById("rememberPassphraseCheckbox");
  const generateKeypairButton = document.getElementById(
    "generateKeypairButton",
  );

  fileInput.addEventListener("change", handleKeyUpload);
  privateKeyFileInput.addEventListener("change", handlePrivateKeyUpload);
  actionButton.addEventListener("click", () => {
    const text = plaintextElement ? plaintextElement.value : "";
    const looksLikePgp = isLikelyPgpMessage(text);
    if (looksLikePgp) {
      void decryptCurrentText();
    } else {
      void encryptCurrentText();
    }
  });
  copyButton.addEventListener("click", () => {
    void copyCiphertext();
  });
  plaintextElement.addEventListener("input", () => {
    updateActionButtonsBasedOnText();
  });
  if (passphraseElement) {
    passphraseElement.addEventListener("input", () => {
      syncStoredPassphrase();
    });
  }
  if (rememberCheckbox) {
    rememberCheckbox.addEventListener("change", () => {
      syncStoredPassphrase();
    });
  }
  if (generateKeypairButton) {
    generateKeypairButton.addEventListener("click", () => {
      void generateAndDownloadKeypair();
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void loadDefaultPublicKey();
  wireUpEvents();
  try {
    const storedPassphrase = window.localStorage.getItem(
      PASSPHRASE_STORAGE_KEY,
    );
    const passphraseElement = document.getElementById("privateKeyPassphrase");
    const rememberCheckbox = document.getElementById(
      "rememberPassphraseCheckbox",
    );
    if (storedPassphrase && passphraseElement && rememberCheckbox) {
      passphraseElement.value = storedPassphrase;
      rememberCheckbox.checked = true;
    }
  } catch (error) {
    // Ignore localStorage errors (e.g., disabled or unavailable).
  }
  updateActionButtonsBasedOnText();
});


