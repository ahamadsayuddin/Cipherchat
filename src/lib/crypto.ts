/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Web Crypto API based E2EE Utility
export interface KeyPair {
  publicKey: string;
  privateKey: CryptoKey;
}

export async function generateKeyPair(): Promise<KeyPair> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));

  return {
    publicKey: publicKeyBase64,
    privateKey: keyPair.privateKey,
  };
}

export async function encryptWithPublicKey(publicKeyBase64: string, data: string): Promise<string> {
  const publicKeyBuffer = Uint8Array.from(atob(publicKeyBase64), (c) => c.charCodeAt(0));
  const publicKey = await window.crypto.subtle.importKey(
    "spki",
    publicKeyBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );

  const encodedData = new TextEncoder().encode(data);
  const encryptedBuffer = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, encodedData);
  return btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer)));
}

export async function decryptWithPrivateKey(privateKey: CryptoKey, encryptedBase64: string): Promise<string> {
  const encryptedBuffer = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  const decryptedBuffer = await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, encryptedBuffer);
  return new TextDecoder().decode(decryptedBuffer);
}

// AES symmetric encryption for messages (faster than RSA for bodies)
// We use RSA to share a random symmetric key, or just use RSA for short messages.
// For this app, to keep it simple but secure, we'll encrypt a random AES key with RSA and send it.
// Actually, let's keep it very simple: we encrypt the message body with RSA if it's small, 
// or use a hybrid approach. Given the 2048-bit RSA limit, let's use AES.

export async function generateSymmetricKey() {
  return await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptMessage(data: string, key: CryptoKey): Promise<{ content: string; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    content: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptMessage(encrypted: string, ivBase64: string, key: CryptoKey): Promise<string> {
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
  const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

// Convert CryptoKey to/from Base64 for sharing
export async function encryptHybrid(data: string, recipientPublicKeyBase64: string): Promise<{ content: string; iv: string; encryptedKey: string }> {
  // 1. Generate one-time symmetric key
  const aesKey = await generateSymmetricKey();
  
  // 2. Encrypt message with AES
  const { content, iv } = await encryptMessage(data, aesKey);
  
  // 3. Export AES key to raw bytes
  const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  
  // 4. Encrypt AES key with recipient's RSA Public Key
  const publicKeyBuffer = Uint8Array.from(atob(recipientPublicKeyBase64), (c) => c.charCodeAt(0));
  const rsaPublicKey = await window.crypto.subtle.importKey(
    "spki",
    publicKeyBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
  
  const encryptedAesKeyBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    rsaPublicKey,
    exportedAesKey
  );
  
  const encryptedKey = btoa(String.fromCharCode(...new Uint8Array(encryptedAesKeyBuffer)));
  
  return { content, iv, encryptedKey };
}

export async function decryptHybrid(content: string, iv: string, encryptedKey: string, recipientPrivateKey: CryptoKey): Promise<string> {
  // 1. Decrypt AES key with Private Key
  const encryptedKeyBuffer = Uint8Array.from(atob(encryptedKey), (c) => c.charCodeAt(0));
  const aesKeyRaw = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    recipientPrivateKey,
    encryptedKeyBuffer
  );
  
  // 2. Import decrypted AES key
  const aesKey = await window.crypto.subtle.importKey(
    "raw",
    aesKeyRaw,
    { name: "AES-GCM", length: 256 },
    true,
    ["decrypt"]
  );
  
  // 3. Decrypt message with AES
  return await decryptMessage(content, iv, aesKey);
}
