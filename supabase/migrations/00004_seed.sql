-- =====================================================================
-- Seed: default categories
-- =====================================================================

insert into public.categories (name, slug, icon, sort_order) values
  ('Photography',  'photography',  'camera',         10),
  ('Illustration', 'illustration', 'palette',        20),
  ('Icons',        'icons',        'shapes',         30),
  ('Audio',        'audio',        'music',          40),
  ('Video',        'video',        'video',          50),
  ('3D Models',    '3d-models',    'box',            60),
  ('Fonts',        'fonts',        'type',           70),
  ('Templates',    'templates',    'layout',         80),
  ('Code',         'code',         'code',           90),
  ('Documents',    'documents',    'file-text',     100),
  ('Datasets',     'datasets',     'database',      110),
  ('Other',        'other',        'package',       999)
on conflict (slug) do nothing;
