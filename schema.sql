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

create table clue_collection (
  id text not null primary key,
  puzzle_id text,
  title text not null,
  author_id text,
  "description" text,
  created_date timestamp not null,
  metadata1 text, -- AI Score
  metadata2 text
);

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

create table entry_score (
  "entry" text not null,
  lang text not null,
  obscurity_score int,
  quality_score int,
  source_ai text not null,
  primary key("entry", lang)
);

create table clue (
  id text not null primary key,
  "entry" text not null,
  lang text not null,
  clue text not null,
  response_template text,
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
  literal_translation text not null,
  natural_translation text not null,
  source_ai text not null,
  primary key(clue_id, lang, source_ai)
);

create table translated_entry (
  clue_id text not null,
  "entry" text not null,
  lang text not null,
  display_text text not null,
  source_ai text not null,
  primary key(clue_id, "entry", lang, source_ai)
);
