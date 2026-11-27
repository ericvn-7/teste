# Raiz Studio — vitrine e encomendas

Site de divulgação de projetos digitais com formulário de pedidos pelo WhatsApp e painel administrativo em `/admin`. Não há checkout nem gateway de pagamento: cada pedido é registrado para acompanhamento e, em seguida, o cliente abre uma conversa no WhatsApp.

## Recursos do painel

- Duas contas de administrador, criadas uma única vez com uma chave privada.
- Cada administrador pode alterar o próprio usuário e senha.
- Caixa de pedidos com dados do cliente, descrição, link de WhatsApp e etapas de acompanhamento.
- Cadastro, edição, exclusão e publicação/ocultação de projetos de exemplo.
- Edição do nome do estúdio, apresentação, WhatsApp, Instagram e e-mail.

## Preparar o banco de dados

O projeto usa Supabase para guardar pedidos, projetos, configurações e as contas administrativas. Os dados não são salvos em arquivos da implantação.

1. Crie um projeto no Supabase.
2. No painel Supabase, abra **SQL Editor → New query**.
3. Copie e execute todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql). Isso cria as tabelas e três projetos de exemplo.
4. Em **Project Settings → API Keys**, copie a **Project URL** e uma chave **Secret** (`sb_secret_...`). A chave secreta deve ficar apenas nas variáveis de ambiente da Vercel. Nunca a coloque nos arquivos do site ou no GitHub.

## Publicar na Vercel

1. Extraia o ZIP e envie para o GitHub todos os arquivos e pastas de dentro dele, mantendo `api/`, `lib/`, `assets/` e `supabase/` na raiz. Não envie o ZIP como um único arquivo. Na Vercel, a **Root Directory** precisa ser a pasta que contém `index.html`, `package.json`, `api/` e `lib/`.
2. Escolha **Other** como Framework Preset. Deixe Build Command e Install Command vazios; use `.` como Output Directory.
3. Em **Project Settings → Environment Variables**, cadastre:

   - `SUPABASE_URL`: a Project URL do Supabase.
   - `SUPABASE_SECRET_KEY`: a chave Secret `sb_secret_...` do Supabase.
   - `SESSION_SECRET`: um segredo aleatório com pelo menos 32 caracteres.
   - `ADMIN_SETUP_KEY`: outro segredo aleatório, com pelo menos 32 caracteres, que vocês usarão uma vez para criar os dois acessos.
   - `ADMIN_GATE_USER`: usuário da primeira barreira de acesso ao painel.
   - `ADMIN_GATE_PASSWORD`: senha da primeira barreira de acesso ao painel, diferente das senhas dos administradores.

4. Salve e faça um novo deploy para aplicar as variáveis.
5. Abra `https://SEU-SITE.vercel.app/admin`. O navegador pedirá o usuário e a senha da primeira barreira. Depois, informe `ADMIN_SETUP_KEY` somente se o painel ainda não tiver sido configurado e crie os dois usuários e senhas. As senhas devem ter pelo menos 12 caracteres. O cadastro público fica fechado depois dessa primeira configuração.
6. No painel, abra **Configurações** e informe o WhatsApp com DDI e DDD, por exemplo `+55 11 99999-9999`.

## Endereço do site

Fazer um novo deploy não troca o endereço de produção: a URL estável do projeto continua apontando para a versão de produção mais recente. Para ver qual é, abra o projeto na Vercel e entre em **Settings → Domains**. URLs longas com um código entre o nome do projeto e `vercel.app` identificam uma implantação específica e não são o endereço estável. Um domínio próprio só passa a funcionar depois de ser adicionado ao projeto e configurado no provedor de DNS.

## Conferência após enviar os arquivos

No commit do GitHub, confirme que existem `api/orders.js`, `lib/db.js`, `assets/raiz-logo.png` e `assets/raiz-studio-logo.svg`. Depois, confira na Vercel se o deployment desse commit está em **Production** e abra o domínio listado em **Settings → Domains**. Se `/api/orders` ainda retornar erro, abra **Logs → Runtime Logs**, filtre por `/api/orders` e confira o primeiro erro vermelho; não faça um pedido de teste com dados reais enquanto a função estiver falhando.

As chaves e segredos ficam somente no servidor da Vercel; a chave Secret do Supabase nunca é enviada ao navegador. O backend autentica as sessões com cookie `HttpOnly`, e as senhas são armazenadas como hashes com salt.

## Manter o site

A Vercel cria uma implantação quando vocês enviam alterações para a branch conectada ao projeto. O conteúdo editado no painel é salvo no Supabase e aparece no site sem precisar editar os arquivos.

Se os dois administradores perderem o acesso, remova as duas linhas de `site_admins` no SQL Editor e use novamente a chave de configuração no `/admin` para cadastrar os dois acessos. Os pedidos, projetos e configurações ficam preservados.

## Estrutura

- `index.html`, `styles.css`, `app.js`: vitrine pública.
- `admin.html`, `admin.css`, `admin.js`: painel administrativo.
- `api/`: funções da Vercel para pedidos, projetos, sessão e administração.
- `lib/`: acesso ao Supabase e autenticação de administrador.
- `supabase/schema.sql`: estrutura e conteúdo inicial do banco.
