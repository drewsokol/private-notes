export function hexStringToUint8Array(hexString : string) : Uint8Array {
  return new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
}

export function uint8ArrayToHexString(uint8Array: Uint8Array) : string {
  return Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexStringToAesKey(hexString : string) : Uint8Array {
  return new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
}

export async function initializeEncryptionKey(passkey?: string) : Promise<CryptoKey> {
  let keyMaterial;
  if(!passkey){
    passkey='AbraKadabra12345';
    keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(passkey),
      "AES-GCM",
      false,
      ["encrypt", "decrypt"]
    );
  }else{
    passkey = await stringToHash(passkey);
    keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      hexStringToAesKey(passkey),
      "AES-GCM",
      false,
      ["encrypt", "decrypt"]
    );
  }

  return keyMaterial;
}

export async function stringToHash(input: string) {
  const msgUint8 = new TextEncoder().encode(input);                                  
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);                
  const hashArray = Array.from(new Uint8Array(hashBuffer));                     
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); 
  return hashHex;
}

export async function encryptString(inputString : string, passkey?: string) : Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedValue = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    await initializeEncryptionKey(passkey),
    new TextEncoder().encode(inputString)
  );
  return uint8ArrayToHexString(iv) + uint8ArrayToHexString(new Uint8Array(encryptedValue));
}

export async function decryptString(encryptedString: string, passkey?: string) : Promise<string> {
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
    await initializeEncryptionKey(passkey),
    encryptedValue
  );

  return new TextDecoder().decode(decryptedValueArrayBuffer);
}