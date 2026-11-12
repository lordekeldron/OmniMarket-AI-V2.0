// @vitest-environment node
import { describe, expect, test } from "vitest";
import { CookieSession, COOKIE_PATH } from "./session";
import { Vault } from "./vault";

const SECRET = "um-segredo-de-teste-com-mais-de-16-caracteres";

describe("Vault", () => {
  test("cifra e decifra, e o texto cifrado não revela o conteúdo", async () => {
    const vault = new Vault(SECRET);
    const sealed = await vault.seal({ token: "at_abc123" }, "omni_c_1");
    expect(sealed).not.toContain("at_abc123");
    expect(await vault.open<{ token: string }>(sealed, "omni_c_1")).toEqual({ token: "at_abc123" });
  });

  test("recusa cookie adulterado, de outra chave ou de outra finalidade", async () => {
    const vault = new Vault(SECRET);
    const sealed = await vault.seal({ a: 1 }, "omni_c_1");

    const tampered = sealed.slice(0, -4) + (sealed.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(await vault.open(tampered, "omni_c_1")).toBeUndefined();
    expect(await new Vault("outro-segredo-completamente-diferente").open(sealed, "omni_c_1")).toBeUndefined();
    // Um cookie de autorização pendente não pode virar cookie de conta.
    expect(await vault.open(sealed, "omni_oauth")).toBeUndefined();
    expect(await vault.open("lixo", "omni_c_1")).toBeUndefined();
  });

  test("sem segredo (ou segredo curto) o cofre não grava nada", async () => {
    expect(new Vault(undefined).available).toBe(false);
    expect(new Vault("curto").available).toBe(false);
    await expect(new Vault(undefined).seal({}, "x")).rejects.toThrow(/CONNECTOR_SECRET/);
    expect(await new Vault(undefined).open("a.b", "x")).toBeUndefined();
  });
});

describe("CookieSession", () => {
  const record = (id: string) => ({
    summary: { id, providerId: "openseo" as const, label: "Conta", authMode: "oauth" as const, status: "connected" as const, createdAt: "2026-11-11T00:00:00.000Z" },
    secrets: { tokens: { access_token: "at_secreto", token_type: "Bearer" } },
  });

  test("grava com atributos de segurança e relê o que gravou", async () => {
    const vault = new Vault(SECRET);
    const first = new CookieSession(null, vault, true);
    const id = CookieSession.newConnectionId();
    await first.put(record(id));

    const [header] = first.setCookieHeaders();
    expect(header).toMatch(/HttpOnly/);
    expect(header).toMatch(/SameSite=Lax/);
    expect(header).toMatch(/Secure/);
    expect(header).toContain(`Path=${COOKIE_PATH}`);
    expect(header).not.toContain("at_secreto");

    const cookie = (header as string).split(";")[0] as string;
    const second = new CookieSession(cookie, vault, true);
    const records = await second.records();
    expect(records).toHaveLength(1);
    expect(records[0]?.secrets.tokens?.access_token).toBe("at_secreto");
  });

  test("ignora cookies de conta que não abrem e nomes fora do padrão", async () => {
    const vault = new Vault(SECRET);
    const session = new CookieSession("omni_c_0123456789abcdef=lixo; omni_c_xx=a.b; outro=1", vault, false);
    expect(await session.records()).toEqual([]);
  });

  test("um cookie de conta copiado para outro id não é aceito", async () => {
    const vault = new Vault(SECRET);
    const writer = new CookieSession(null, vault, false);
    await writer.put(record("aaaaaaaaaaaaaaaa"));
    const value = (writer.setCookieHeaders()[0] as string).split(";")[0]?.split("=")[1] as string;

    const reader = new CookieSession(`omni_c_bbbbbbbbbbbbbbbb=${value}`, vault, false);
    expect(await reader.records()).toEqual([]);
  });

  test("remover expira o cookie", async () => {
    const vault = new Vault(SECRET);
    const writer = new CookieSession(null, vault, false);
    const id = CookieSession.newConnectionId();
    await writer.put(record(id));
    const cookie = (writer.setCookieHeaders()[0] as string).split(";")[0] as string;

    const session = new CookieSession(cookie, vault, false);
    expect(await session.remove(id)).toBe(true);
    expect(session.setCookieHeaders().at(-1)).toMatch(/Max-Age=0/);
    expect(await session.remove(id)).toBe(false);
  });
});
