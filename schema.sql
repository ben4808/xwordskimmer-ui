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
  lang text not null default 'en',
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
  lang text not null,
  author text, -- One of author or creator_id might be populated
  creator_id text,
  "description" text,
  is_private boolean not null default false,
  created_date timestamp not null,
  modified_date timestamp not null,
  metadata1 text, -- AI composite score
  metadata2 text,
  "source" text, -- Book it came from? AI source? Important in case I need to remove copyrighted data.
  clue_count int not null default 0
);

CREATE INDEX IX_Date ON clue_collection(created_date ASC);

create table "entry" (
  "entry" text not null,
  root_entry text, -- For inflected forms, the base form
  lang text not null,
  "length" int not null,
  display_text text,
  entry_type text,
  -- directly set if no senses exist, otherwise average of sense scores
  avg_familiarity_score int,
  avg_quality_score int,
  loading_status text not null default 'Ready', -- Ready, Processing, Error, Invalid
  primary key("entry", lang)
);

create table entry_tags (
  "entry" text not null,
  lang text not null,
  tag text not null,
  "value" text,
  primary key("entry", lang, tag)
);

create table entry_score (
  "entry" text not null,
  lang text not null,
  familiarity_score int,
  quality_score int,
  source_ai text not null,
  primary key("entry", lang, source_ai)
);

create table sense (
  id text not null primary key,
  "entry" text not null,
  lang text not null,
  summary text,
  "definition" text,
  part_of_speech text,
  commonness text,
  familiarity_score int,
  quality_score int,
  similar_entries text[],
  source_ai text
);

create table sense_entry_translation (
  sense_id text not null,
  "entry" text not null,
  lang text not null,
  natural_translations text[],
  colloquial_translations text[],
  primary key(sense_id, "entry", lang)
);

create table example_sentence (
  id text not null primary key,
  sense_id text not null
);

create table example_sentence_translation (
  example_sentence_id text not null,
  lang text not null,
  sentence text not null,
  primary key(example_sentence_id, lang)
);

create table sense_entry_score (
  sense_id text not null,
  familiarity_score int,
  quality_score int,
  source_ai text not null,
  primary key(sense_id, source_ai)
);

create table clue (
  id text not null primary key,
  "entry" text not null, -- in some cases only for reference if there is a sense provided
  lang text not null, -- in some cases only for reference if there is a sense provided
  sense_id text, -- optional, if linked to a specific sense
  custom_clue text,
  custom_display_text text
);

create table collection__clue (
  collection_id text not null,
  clue_id text not null,
  "order" int not null,
  metadata1 text, -- Clue index in puzzle
  metadata2 text,
  primary key(collection_id, clue_id)
);

create table "user" (
  id text not null primary key,
  email text not null unique,
  first_name text,
  last_name text,
  native_lang text,
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
  correct_solves_needed int not null,
  correct_solves int not null,
  incorrect_solves int not null,
  last_solve date,
  primary key(user_id, clue_id)
);

create table user__puzzle_clue (
  user_id text not null,
  clue_id text not null,
  hints_used int not null,
  primary key(user_id, clue_id)
);

create table entry_info_queue (
  id serial primary key,
  "entry" text not null,
  lang text not null,
  added_at timestamp not null default now()
);

create table example_sentence_queue (
  id serial primary key,
  sense_id text not null,
  added_at timestamp not null default now()
);

create table collection_access (
  collection_id text not null,
  user_id text not null,
  primary key(collection_id, user_id)
);

create table crossword_familiarity_queue (
  id serial primary key,
  "entry" text not null,
  lang text not null,
  added_at timestamp not null default now()
);

create table crossword_quality_queue (
  id serial primary key,
  "entry" text not null,
  lang text not null,
  added_at timestamp not null default now()
);
