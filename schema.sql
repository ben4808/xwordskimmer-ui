/*
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
*/

create table puzzle (
  id int not null primary key,
  publicationId text,
  "date" date not null,
  author text,
  title text not null,
  copyright text,
  notes text,
  width int not null,
  height int not null,
  sourceLink text,
  puzData bytea not null
);

create table cluecollection (
  id int not null primary key,
  puzzleId int,
  title text not null,
  author text,
  "description" text,
  created timestamp not null,
  metadata1 text,
  metadata2 text
);

create table "entry" (
  "entry" text not null,
  lang text not null,
  "raw" text,
  primary key("entry", lang)
);

create table clue (
  id int not null primary key,
  "entry" text not null,
  lang text not null,
  clue text not null,
  naturalClue text,
  source text
);

create table collection_clue (
  collectionId int not null,
  clueId int not null,
  "order" int not null,
  metadata1 text,
  metadata2 text,
  primary key(collectionId, clueId)
);

create table clue_clue (
  primaryClue int not null,
  secondaryClue int not null,
  primary key(primaryClue, secondaryClue)
);
