-- Enable required extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text NOT NULL,
  content text NOT NULL,
  type text NOT NULL,
  uploaded_at timestamp NOT NULL DEFAULT now()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id varchar(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  line_number integer NOT NULL,
  author text NOT NULL,
  content text NOT NULL,
  parent_comment_id varchar(255),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_document_line ON comments(document_id, line_number);

-- Highlights table
CREATE TABLE IF NOT EXISTS highlights (
  id varchar(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  document_id varchar(255) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  line_number integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_highlight_document_line ON highlights(document_id, line_number);
