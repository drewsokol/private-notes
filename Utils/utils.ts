export function hexStringToUint8Array(hexString : string) : Uint8Array {
  return new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
}

export function uint8ArrayToHexString(uint8Array: Uint8Array) : string {
  return Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function initializeEncryptionKey() : Promise<CryptoKey> {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode('AbraKadabra12345'),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );
  return keyMaterial;
}

export async function encryptString(inputString : string) : Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedValue = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    await initializeEncryptionKey(),
    new TextEncoder().encode(inputString)
  );
  return uint8ArrayToHexString(iv) + uint8ArrayToHexString(new Uint8Array(encryptedValue));
}

export async function decryptString(encryptedString : string) : Promise<string> {
  if (!encryptedString) {
    return "";
  }

  const iv = hexStringToUint8Array(encryptedString.slice(0, 24)); // Get the stored IV
  const encryptedValue = hexStringToUint8Array(encryptedString.slice(24)); 

  const decryptedValueArrayBuffer = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    await initializeEncryptionKey(),
    encryptedValue
  );

  return new TextDecoder().decode(decryptedValueArrayBuffer);
}