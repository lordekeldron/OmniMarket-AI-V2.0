/**
 * Saldo de tokens. É uma interface de propósito: o app ainda não tem banco de dados
 * nem login verificado no servidor.
 *
 * ATENÇÃO — `MemoryLedger` é PROVISÓRIO. Ele vive na memória de um isolate do Worker:
 * some em reinício/deploy e pode divergir entre instâncias. Serve para testar o fluxo
 * ponta a ponta; antes de cobrar de verdade, implemente `TokenLedger` sobre um banco
 * durável (a regra `credit` precisa ser atômica e idempotente por `paymentId`).
 */
export interface CreditResult {
  /** false quando este pagamento já tinha sido creditado antes. */
  credited: boolean;
  balance: number;
}

export interface TokenLedger {
  credit(input: { paymentId: string; userId: string; tokens: number }): Promise<CreditResult>;
  balance(userId: string): Promise<number>;
}

export class MemoryLedger implements TokenLedger {
  private readonly balances = new Map<string, number>();
  private readonly seen = new Set<string>();

  async credit({ paymentId, userId, tokens }: { paymentId: string; userId: string; tokens: number }): Promise<CreditResult> {
    const current = this.balances.get(userId) ?? 0;
    if (this.seen.has(paymentId)) return { credited: false, balance: current };
    this.seen.add(paymentId);
    const balance = current + tokens;
    this.balances.set(userId, balance);
    return { credited: true, balance };
  }

  async balance(userId: string): Promise<number> {
    return this.balances.get(userId) ?? 0;
  }
}

// Um único ledger por isolate (o handler é recriado a cada requisição).
let shared: TokenLedger | undefined;
export const sharedLedger = (): TokenLedger => (shared ??= new MemoryLedger());
