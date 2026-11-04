# Guia de Banco de Dados (Supabase PostgreSQL) & Login com Google

O site **Espaço Católico Santo Antônio** já possui o sistema completo de:
- **Cadastro de Conta pelo próprio site** (Nome completo, E-mail, WhatsApp, CPF e Senha)
- **Login Direto com Google** (OAuth / Conta Google)
- **Isolamento Individual por Conta (RLS / Escopo por Usuário)**: Cada pessoa que se cadastra ou entra vê **apenas os seus próprios itens no carrinho, seus próprios endereços e seus próprios pedidos**, e tudo fica salvo na conta dela mesmo ao sair e entrar novamente.

---

## Como conectar ao seu projeto Supabase PostgreSQL na Nuvem (Passo a Passo)

1. Crie um projeto gratuito em [https://supabase.com](https://supabase.com).
2. No menu lateral do Supabase, clique em **SQL Editor** -> **New Query**.
3. Abra o arquivo [`supabase/setup_completo.sql`](./supabase/setup_completo.sql) deste repositório, copie todo o conteúdo, cole no SQL Editor do Supabase e clique em **Run**.
   - Isso criará automaticamente todas as tabelas (`profiles`, `addresses`, `categories`, `products`, `carts`, `cart_items`, `orders`, `order_items`, `payments`, `coupons`, `reviews`), gatilhos de criação automática de perfil (`handle_new_user`) e **Políticas de Segurança RLS (Row Level Security)** onde cada cliente (`auth.uid()`) só acessa os dados da sua própria conta.
4. No menu do Supabase, vá em **Project Settings -> API** e copie:
   - **Project URL** (`https://seu-projeto.supabase.co`)
   - **anon public key** (`eyJhbG...`)
5. Você pode conectar de duas formas:
   - **Direto pelo navegador (sem precisar mexer em código)**: Na página `/login` do site, clique em **"Configurar Conexão Supabase PostgreSQL"** no rodapé do card e cole a URL e a Anon Key.
   - **Ou via arquivo `.env.local`**:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_publica
     ```

---

## Como habilitar o Login Oficial do Google no Supabase

1. No painel do Supabase, acesse **Authentication -> Providers -> Google** e ative a chave **Enable Sign in with Google**.
2. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crie um **OAuth 2.0 Client ID** (Aplicativo Web) e adicione a **Callback URL** fornecida pelo Supabase (`https://seu-projeto.supabase.co/auth/v1/callback`).
3. Em **Authentication -> URL Configuration** no Supabase, adicione a URL do seu site em **Redirect URLs**:
   - `https://luizgomess19.github.io/SiteEspacoCatolico/**`
   - `http://localhost:3000/**`
