# Omni Market AI 

AI Marketing Specialist. 


## Compra de tokens (Mercado Pago · Checkout Pro)

Aba **Tokens**: o usuário digita quantos tokens quer, vê o total e paga no Mercado Pago (Pix, cartão ou boleto). O valor é sempre recalculado no servidor (`TOKEN_PRICE_BRL × quantidade`); o navegador só envia a quantidade.

Configuração (Lovable Secrets): `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `APP_URL` (HTTPS público) e, opcionalmente, `TOKEN_PRICE_BRL` (padrão 0,10). No painel do Mercado Pago, cadastre o webhook `<APP_URL>/api/payments/webhook` com o tópico **Pagamentos**.

Fluxo: o pagamento aprovado é confirmado direto na API do Mercado Pago (pelo webhook e, como reforço, na página de retorno) e credita o saldo uma única vez por pagamento. Rotas: `/api/payments/{config,checkout,status,balance,webhook}`.

**Antes de cobrar de verdade:** o saldo fica em `MemoryLedger` (`src/omni-server/payments/ledger.ts`), provisório e em memória. É preciso implementar `TokenLedger` sobre um banco durável e identificar o usuário no servidor (o login atual é só no navegador).
