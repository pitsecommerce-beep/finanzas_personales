INSERT INTO categories (slug, label, emoji, type, sort_order, is_system)
VALUES ('belleza', 'Belleza y estilo', '✨', 'expense', 16, true)
ON CONFLICT (slug) DO NOTHING;
