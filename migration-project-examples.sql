-- Expands showcase categories and replaces the generic demo projects.
-- Non-destructive to admin accounts, usernames, and password hashes.
alter table public.projects drop constraint if exists projects_category_check;
alter table public.projects add constraint projects_category_check
  check (category in ('Institucional', 'Loja virtual', 'Landing page', 'Blog', 'Receitas', 'Notícias'));

insert into public.projects (slug, title, category, description, price_label, accent, badge, mock_title, sort_order, is_visible)
values
  ('caderno-de-domingo', 'Caderno de Domingo', 'Blog', 'Um blog editorial para publicar histórias, entrevistas e ideias com leitura confortável.', 'Sob consulta', 'rose', 'BLOG · CULTURA', 'Ideias que merecem ser lidas.', 1, true),
  ('mesa-de-afeto', 'Mesa de Afeto', 'Receitas', 'Receitas organizadas por ocasião, ingredientes e tempo de preparo.', 'Sob consulta', 'sun', 'RECEITAS · GASTRONOMIA', 'Hoje tem sabor de casa.', 2, true),
  ('ponto-presente', 'Ponto Presente', 'Loja virtual', 'Uma loja online acolhedora para descobrir produtos e comprar com facilidade.', 'Sob consulta', 'blue', 'LOJA · PRESENTES', 'Encontre algo especial.', 3, true),
  ('agora-em-foco', 'Agora em Foco', 'Notícias', 'Um portal de notícias com editorias, manchetes e leitura clara em qualquer tela.', 'Sob consulta', 'ink', 'NOTÍCIAS · PORTAL', 'O que acontece importa.', 4, true)
on conflict (slug) do update set
  title = excluded.title,
  category = excluded.category,
  description = excluded.description,
  accent = excluded.accent,
  badge = excluded.badge,
  mock_title = excluded.mock_title,
  sort_order = excluded.sort_order,
  is_visible = excluded.is_visible;

delete from public.projects where slug in ('casa-nativa', 'flor-de-sol', 'movimento-livre');
