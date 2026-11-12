# Omni Market Insight Atlas

Conecte-se ao repositório: https://github.com/lordekeldron/OmniMarket-AI. Quero que você melhore o design da plataforma na parte que o usuário tem acesso às várias funcionalidades da plataforma. (Visão Geral, Tendências etc.)

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ab95e6b9-f2de-4b1b-a29f-ee20728a551f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Conectores de marketing (Supermetrics, Metricool, OpenSEO, Adspirer)

Aba **Contas**: o usuário conecta cada plataforma com o próprio login (OAuth via MCP); as métricas dos últimos 30 dias são buscadas ao conectar e exibidas em uma aba por conta.

Configuração (em Lovable Secrets, nunca no repositório):

- `CONNECTOR_SECRET` (obrigatório, ≥ 16 caracteres): chave que cifra as credenciais, guardadas em cookies httpOnly no navegador do usuário. Trocar o valor desconecta todas as contas.
- `APP_URL` (opcional): endereço público do app, se o detectado automaticamente estiver errado.
- Se a plataforma não aceitar registro dinâmico de cliente, defina `<SUPERMETRICS|METRICOOL|OPENSEO|ADSPIRER>_OAUTH_CLIENT_ID` e `_OAUTH_CLIENT_SECRET`. A URL de retorno a cadastrar é `<APP_URL>/api/connections/oauth/callback`.
- `<PREFIXO>_MCP_URL` sobrescreve o endereço do servidor MCP de cada plataforma.

Limites: até 8 contas por navegador; os dados de métricas ficam só no `localStorage` do usuário.
