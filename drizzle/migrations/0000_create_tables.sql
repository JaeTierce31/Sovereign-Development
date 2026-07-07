CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY NOT NULL,
  email text NOT NULL UNIQUE,
  username text NOT NULL UNIQUE,
  tier text DEFAULT 'free',
  stripe_customer_id text,
  created_at bigint
);

CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY NOT NULL,
  name text NOT NULL,
  owner_id text REFERENCES users(id),
  is_public boolean DEFAULT false,
  domain text,
  created_at bigint
);

CREATE TABLE IF NOT EXISTS files (
  id text PRIMARY KEY NOT NULL,
  project_id text REFERENCES projects(id),
  path text NOT NULL,
  content text,
  language text,
  version integer DEFAULT 1,
  updated_at bigint
);
