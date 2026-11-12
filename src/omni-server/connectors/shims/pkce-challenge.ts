/**
 * Substituto de `pkce-challenge` para o build de Worker.
 *
 * O pacote original só publica build para Node e para navegador, e o Worker não
 * tem nenhuma das duas condições, então o empacotamento falha. Este arquivo tem
 * o mesmo contrato (PKCE S256, RFC 7636) e usa apenas WebCrypto, que o Worker tem.
 * Ligado por alias em vite.config.ts.
 */

const MASK = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~";
// Descarta bytes que enviesariam a distribuição ao tomar o resto da divisão.
const EVEN_CUTOFF = 256 - (256 % MASK.length);

function randomString(size: number): string {
  let result = "";
  while (result.length < size) {
    for (const byte of crypto.getRandomValues(new Uint8Array(size - result.length))) {
      if (byte < EVEN_CUTOFF) result += MASK.charAt(byte % MASK.length);
    }
  }
  return result;
}

export async function generateChallenge(codeVerifier: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier)));
  let binary = "";
  for (const byte of digest) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, "");
}

/** @param length tamanho do verificador, entre 43 e 128 (padrão 43). */
export default async function pkceChallenge(length?: number): Promise<{ code_verifier: string; code_challenge: string }> {
  const size = length ?? 43;
  if (size < 43 || size > 128) throw new Error(`Expected a length between 43 and 128. Received ${size}.`);
  const code_verifier = randomString(size);
  return { code_verifier, code_challenge: await generateChallenge(code_verifier) };
}

export async function verifyChallenge(codeVerifier: string, expectedChallenge: string): Promise<boolean> {
  return (await generateChallenge(codeVerifier)) === expectedChallenge;
}
