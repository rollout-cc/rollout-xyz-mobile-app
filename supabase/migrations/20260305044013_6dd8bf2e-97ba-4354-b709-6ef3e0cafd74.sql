
-- Make EARTHGANG operate at a loss: currently rev=$141k, exp=$67.2k (profit)
-- Add more expenses to push expenses above revenue
INSERT INTO transactions (artist_id, amount, description, type, status, transaction_date, approval_status)
VALUES
  ('e8b30711-9c00-437e-b880-55dd1de3f7cf', -45000, 'Album recording sessions', 'expense', 'paid', '2026-01-15', 'approved'),
  ('e8b30711-9c00-437e-b880-55dd1de3f7cf', -18000, 'Music video production', 'expense', 'paid', '2026-02-10', 'approved'),
  ('e8b30711-9c00-437e-b880-55dd1de3f7cf', -22000, 'Tour van rental & logistics', 'expense', 'paid', '2026-01-28', 'approved');

-- Make Promise Ring operate at a loss: currently rev=$63.7k, exp=$42.3k (profit)
-- Add more expenses to push it into a loss
INSERT INTO transactions (artist_id, amount, description, type, status, transaction_date, approval_status)
VALUES
  ('dc677dc8-ac96-4119-b5c4-e1e0fd4c7154', -25000, 'Studio album production', 'expense', 'paid', '2026-02-05', 'approved'),
  ('dc677dc8-ac96-4119-b5c4-e1e0fd4c7154', -12000, 'Merch production run', 'expense', 'paid', '2026-01-20', 'approved'),
  ('dc677dc8-ac96-4119-b5c4-e1e0fd4c7154', -8500, 'PR campaign retainer', 'expense', 'paid', '2026-02-15', 'approved');
