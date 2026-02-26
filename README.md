# VoidMail (Local Edition)

Analise e limpe sua inbox do Gmail. 100% local.

## Setup

### 1. Google Cloud Console

1. Acesse https://console.cloud.google.com
2. Crie um projeto novo
3. Habilite a **Gmail API**
4. Crie credenciais OAuth2 (tipo: "Aplicativo de desktop")
5. Baixe o `credentials.json`
6. Coloque o arquivo em `backend/credentials.json`
7. Adicione `http://localhost:8000/auth/callback` como URI de redirecionamento autorizado

### 2. Backend (Python)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

API rodando em `http://localhost:8000`

### 3. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Dashboard em `http://localhost:3000`

---

## Uso

1. Acesse `localhost:3000`
2. Clique em "Conectar Gmail"
3. Autorize no Google
4. Aguarde a análise da inbox
5. Explore os dados e use as ações na tabela

---

## Funcionalidades

### Análise da inbox
- **Score de saúde** — porcentagem de emails não-tóxicos na inbox
- **Volume por domínio** — gráfico de barras com os remetentes mais frequentes
- **Evolução temporal** — line chart de volume semanal ou mensal, com destaque do pico
- **Tabela de remetentes** — ordenada por volume, com score de toxicidade por endereço

### Filtragem e navegação
- **Filtro por período** — 7d / 30d / 90d / 6m / 1 ano / tudo, ou data personalizada
- **Busca por remetente** — filtra por nome ou endereço em tempo real
- **Filtro por score** — Todos / Tóxicos / Moderados
- **Agrupamento por domínio** — agrupa endereços do mesmo domínio (ex: linkedin.com · 3 endereços)
- **Paginação** — botão "Carregar mais" busca a próxima página de emails via `nextPageToken` do Gmail; score, gráficos e contadores atualizam em tempo real

### Preview de emails
- Clique no nome de qualquer remetente para abrir um drawer lateral
- Exibe os últimos 10 emails: assunto, data e snippet
- Fecha com ESC ou clicando fora

### Ações disponíveis
| Ação | O que faz |
|------|-----------|
| **Bloquear** | Cria filtro no Gmail — futuros emails vão direto para a lixeira |
| **Limpar** | Apaga todo o histórico daquele remetente |
| **Bloquear + Limpar** | Faz os dois |
| **Desfazer** | Aparece no toast após bloquear — remove o filtro recém-criado |
| **Limpeza automática** | Bloqueia e limpa todos com score ≥ 80 (com confirmação) |

Em modo de agrupamento por domínio, cada endereço individual também tem botões de Bloquear e Limpar.

### UX
- **Skeleton loading** — replica o layout completo durante o carregamento (cards, gráficos, tabela)
- **Toast notifications** — feedback de ações com slide-up; "Desfazer" disponível após bloquear
- **Animação de remoção** — linha exibe "✓ concluído" e desliza para fora após concluir as ações
- **Banner de sessão** — acumula total de emails removidos e remetentes bloqueados na sessão atual

---

## Score de toxicidade

| Score | Significado |
|-------|-------------|
| 0–39  | Baixo risco |
| 40–69 | Moderado    |
| 70–100| Alto risco  |

Calculado com base em: volume de emails, ratio de conteúdo promocional e ausência de respostas enviadas.

---

## Arquitetura

```
backend/
  main.py               # FastAPI app + proxy para o frontend
  gmail_client.py       # OAuth2, token em JSON, migração de pickle
  analyzer.py           # Score de toxicidade, aggregate_senders
  routers/
    auth.py             # Login, callback, logout
    emails.py           # /stats, /stats/more, /timeline, /sender-messages
    actions.py          # /block, /delete, /block-and-delete, /unblock, /auto-clean

frontend/
  src/
    app/page.tsx                      # Dashboard principal, estado de paginação elevado
    components/
      HealthScore.tsx                 # Card com score circular
      TopSendersChart.tsx             # Gráfico de barras por domínio
      TimelineChart.tsx               # Line chart de evolução temporal
      SendersTable.tsx                # Tabela com busca, filtros, agrupamento, paginação
      SenderRow.tsx                   # Linha com ações, confirmação modal, animação
      SenderPreview.tsx               # Drawer lateral com preview de emails
      SkeletonDashboard.tsx           # Skeleton completo do dashboard
    contexts/ToastContext.tsx         # Sistema de toasts com suporte a botão de ação
    lib/api.ts                        # Funções de acesso à API
```