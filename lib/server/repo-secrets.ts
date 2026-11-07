import blake from "blakejs";
import nacl from "tweetnacl";
import { githubRequest } from "@/lib/server/github";

// libsodium crypto_box_seal: ephemeral public key || box(message, blake2b(epk || pk), pk, esk).
export function sealSecret(publicKeyBase64: string, value: string): string {
  const recipient = new Uint8Array(Buffer.from(publicKeyBase64, "base64"));
  const ephemeral = nacl.box.keyPair();
  const nonceInput = new Uint8Array(ephemeral.publicKey.length + recipient.length);
  nonceInput.set(ephemeral.publicKey);
  nonceInput.set(recipient, ephemeral.publicKey.length);
  const nonce = blake.blake2b(nonceInput, undefined, nacl.box.nonceLength);
  const box = nacl.box(new TextEncoder().encode(value), nonce, recipient, ephemeral.secretKey);
  return Buffer.concat([ephemeral.publicKey, box]).toString("base64");
}

export async function setRepositorySecret(
  fullName: string,
  name: string,
  value: string,
  token: string,
): Promise<void> {
  const key = await githubRequest<{ key_id: string; key: string }>(
    `/repos/${fullName}/actions/secrets/public-key`,
    token,
  );
  await githubRequest(`/repos/${fullName}/actions/secrets/${name}`, token, {
    method: "PUT",
    body: JSON.stringify({ encrypted_value: sealSecret(key.key, value), key_id: key.key_id }),
  });
}
