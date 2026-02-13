-- Normalization Tracking Columns
-- Track when normalization was last run and how many submissions it covered
-- so we can decide whether to re-run full normalization or use cached stats

ALTER TABLE exams ADD COLUMN IF NOT EXISTS last_normalized_at TIMESTAMP;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS subs_at_last_normalization INTEGER DEFAULT 0;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS re_norm_threshold REAL DEFAULT 5;
