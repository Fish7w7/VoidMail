# VoidMail (Local Edition)

Analise sua inbox do Gmail, encontre remetentes de alto volume e execute limpezas com confirmacao. O projeto roda localmente: frontend em Next.js, backend em FastAPI e dados acessados pela Gmail API.

## Status do update

Este projeto esta sendo reativado com foco em:

- setup local previsivel;
- configuracao por `.env`;
- acoes perigosas com preview e `dry_run`;
- testes do score/analisador;
- UI mais clara para revisar antes de limpar.

## Requisitos

- Python 3.11+
- Node.js 20+
- Conta Google com Gmail API habilitada

## Google Cloud

1. Acesse https://console.cloud.google.com.
2. Crie ou selecione um projeto.
3. Habilite a Gmail API.
4. Crie credenciais OAuth2 do tipo "Aplicativo de desktop".
5. Baixe o arquivo e salve como `backend/credentials.json`.
6. Adicione `http://localhost:8000/auth/callback` como URI de redirecionamento autorizado.

Os arquivos `backend/credentials.json`, `backend/token.json` e `backend/token.pickle` ficam fora do git.

## Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

API: `http://localhost:8000`

Atalho no Windows:

```powershell
.\scripts\dev-backend.ps1
```

Para testes:

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard: `http://localhost:3000`

Atalho no Windows:

```powershell
.\scripts\dev-frontend.ps1
```

## Configuracao

Copie os exemplos se quiser ajustar portas ou URLs:

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env.local
```

Variaveis principais:

- `VOIDMAIL_FRONTEND_URL`: URL do frontend usada por CORS e OAuth callback.
- `VOIDMAIL_BACKEND_URL`: URL publica/local do backend.
- `VOIDMAIL_ACTION_DRY_RUN`: quando `true`, acoes destrutivas retornam preview sem criar filtros ou apagar emails.
- `NEXT_PUBLIC_API_BASE`: base usada pelo frontend para chamar a API.

## Funcionalidades

- Score de saude da inbox.
- Grafico de volume por dominio.
- Evolucao semanal/mensal de emails.
- Tabela de remetentes com busca, filtros, agrupamento por dominio e paginacao.
- Preview das ultimas mensagens por remetente.
- Bloqueio, limpeza e bloqueio + limpeza com confirmacao.
- Desfazer bloqueio quando o Gmail retorna o `filter_id`.
- Limpeza automatica para remetentes com score alto.

## Como o score funciona

O score considera:

- volume de emails do remetente;
- proporcao de conteudo promocional;
- ausencia de respostas enviadas para o remetente.

Faixas:

- `0-39`: baixo risco;
- `40-69`: moderado;
- `70-100`: alto risco.

## Arquitetura

```text
backend/
  main.py
  config.py
  gmail_client.py
  analyzer.py
  schemas.py
  routers/
    auth.py
    emails.py
    senders.py
    actions.py

frontend/
  src/
    app/page.tsx
    components/
    contexts/ToastContext.tsx
    lib/api.ts
```

## Cuidados

VoidMail atua na sua conta real do Gmail. Antes de usar acoes destrutivas, rode com `VOIDMAIL_ACTION_DRY_RUN=true` ou confira a previa exibida pela UI.

## Auditoria de dependencias

O frontend foi atualizado para Next 16 e React 19 para remover os achados criticos do `npm audit`. Em maio de 2026, o audit ainda reporta um aviso moderado de `postcss` empacotado dentro do proprio `next`; o fix sugerido pelo npm aponta para um downgrade antigo de Next e nao deve ser aplicado. Mantenha o Next atualizado e revise esse ponto quando uma versao nova corrigir a dependencia interna.
