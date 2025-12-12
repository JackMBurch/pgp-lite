# PGP Lite - Client-side PGP Encryptor

Simple, static, vanilla JavaScript web app for encrypting text with PGP in the browser.

Everything runs entirely client-side using OpenPGP.js loaded from a CDN.

## Live demo

You can try the latest version here:

- [https://pgp.thumpy.org/](https://pgp.thumpy.org/)

## Screenshots

<img width="1972" height="1707" alt="image" src="https://github.com/user-attachments/assets/d181759e-3887-421a-89f4-00918848869e" />



## Features

- **Single text area, dual mode**:
  - Type or paste plaintext and click **Encrypt**.
  - Paste an armored PGP message (starting with `-----BEGIN PGP …`) and the button switches to **Decrypt**.
- **Key selection**:
  - **Default public key** loaded from a local `default-public-key.asc` file (gitignored).
  - **User-selected public key file** (`.asc` / `.pgp` / `.gpg` / `.txt`).
- **Private key decryption**:
  - Select an ASCII‑armored private key file and (optionally) its passphrase.
  - Decrypts PGP messages entirely in the browser.
- **Passphrase convenience (optional)**:
  - Checkbox to **save the private key passphrase** in the browser’s local storage.
  - Never sent to any server.
- **Keypair generation (optional)**:
  - Collapsible panel to generate a new **RSA‑4096 keypair** in the browser using OpenPGP.js.
  - Downloads separate `*-public.asc` and `*-private.asc` files.
- **One-click copy**: Copy whatever is currently in the text area (encrypted or decrypted text) to the clipboard.
- **Client-side only**: All crypto and key handling happen locally in your browser; nothing is transmitted to a backend.

### Running with Docker Compose

From the project root:

```bash
docker compose up --build -d
```

Then open:

```text
http://localhost:8989
```

## Configuring the default public key

To have a default recipient key available without selecting a file each time:

1. Create a file named `default-public-key.asc` in the project root (next to `index.html`).
2. Paste your ASCII-armored PGP **public key** into that file:

   ```text
   -----BEGIN PGP PUBLIC KEY BLOCK-----
   ...
   -----END PGP PUBLIC KEY BLOCK-----
   ```

3. This file is listed in `.gitignore`, so it will not be committed to the repo.

At runtime, the app will:

- Load `default-public-key.asc` automatically, and
- Use it whenever **Key source** is set to “Use default public key”.

## Decrypting messages with your private key

The app can also **decrypt** messages using your PGP private key:

1. In the **“Private key (for decryption)”** section:
   - Select your ASCII-armored private key file (e.g. `private.asc`).
   - Enter the **passphrase** for that key if it is encrypted (leave blank if not).
2. Paste an ASCII-armored PGP message into the **“Encrypted output”** textarea.
3. Click **Decrypt**.
4. The decrypted plaintext will appear in the **“Text to encrypt / decrypted output”** textarea.
