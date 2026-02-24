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

## Uso

1. Acesse `localhost:3000`
2. Clique em "Conectar Gmail"
3. Autorize no Google
4. Aguarde a análise da inbox
5. Use os botões na tabela para bloquear/limpar remetentes

## Ações disponíveis

- **Bloquear** — cria filtro no Gmail, futuros emails vão direto para lixeira
- **Limpar** — apaga todo histórico daquele remetente
- **Bloquear + Limpar** — faz os dois
- **Limpeza automática** — bloqueia e limpa todos com score ≥ 80 (com confirmação)

## Score de toxicidade

| Score | Significado |
|-------|-------------|
| 0-39  | Baixo risco |
| 40-69 | Moderado    |
| 70-100| Alto risco  |

Calculado com base em: volume, ratio de conteúdo promocional e ausência de respostas.