/*
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
*/

create table puzzle (
  id text not null primary key,
  publication_id text,
  "date" date not null,
  author text,
  title text not null,
  copyright text,
  notes text,
  width int not null,
  height int not null,
  source_link text
);

create table publication (
  id text not null primary key,
  "name" text not null
);

create table clue_collection (
  id text not null primary key,
  puzzle_id text,
  title text not null,
  author text,
  creator_id text,
  "description" text,
  is_private boolean not null default false,
  created_date timestamp not null,
  modified_date timestamp not null,
  metadata1 text, -- AI composite score
  metadata2 text
);

CREATE INDEX IX_Date ON clue_collection(created_date ASC);

create table "entry" (
  "entry" text not null,
  lang text not null,
  "length" int not null,
  display_text text,
  entry_type text,
  obscurity_score int,
  quality_score int,
  primary key("entry", lang)
);

create table entry_sense (
  id text not null primary key,
  "entry" text not null,
  lang text not null,
  summary text not null,
  "definition" text,
  source_ai text
);

create table entry_score (
  "entry" text not null,
  lang text not null,
  obscurity_score int,
  quality_score int,
  source_ai text not null,
  primary key("entry", lang, source_ai)
);

create table entry_sense_score (
  sense_id text not null,
  obscurity_score int,
  quality_score int,
  source_ai text not null,
  primary key(sense_id, source_ai)
);

create table clue (
  id text not null primary key,
  "entry" text not null,
  lang text not null,
  clue text not null,
  source text -- Book it came from? AI source?
);

create table collection__clue (
  collection_id text not null,
  clue_id text not null,
  "order" int not null,
  metadata1 text, -- Clue index in puzzle
  metadata2 text,
  primary key(collection_id, clue_id)
);

create table translated_clue (
  clue_id text not null,
  lang text not null,
  literal_translation text,
  natural_translation text not null,
  source_ai text not null,
  primary key(clue_id, lang)
);

create table translated_entry (
  clue_id text not null,
  "entry" text not null,
  lang text not null,
  display_text text not null,
  source_ai text not null,
  primary key(clue_id, "entry", lang)
);

create table translated_sense (
  sense_id text not null,
  lang text not null,
  "entry" text not null,
  display_text text not null,
  source_ai text not null,
  primary key(sense_id, lang)
);

create table example_sentence (
  id text not null primary key,
  sense_id text not null,
  lang text not null,
  sentence text not null,
  translated_sentence text not null,
  source_ai text not null
);

create table user (
  id text not null primary key,
  email text not null unique,
  first_name text,
  last_name text,
  created_at timestamp not null default now()
);

create table user__collection (
  user_id text not null,
  collection_id text not null,
  unseen int not null,
  in_progress int not null,
  completed int not null,
  primary key(user_id, collection_id)
);

create table user__clue (
  user_id text not null,
  clue_id text not null,
  total_solves int not null,
  correct_solves int not null,
  incorrect_solves int not null,
  last_solve date,
  primary key(user_id, clue_id)
);
