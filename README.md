# Raiz Estúdio — vitrine e encomendas

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

1. Importe o repositório GitHub na Vercel. Se o projeto estiver numa pasta dentro de outro repositório, defina essa pasta como **Root Directory**.
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
