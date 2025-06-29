/*
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
*/

create table puzzle (
  id text not null primary key,
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
  id text not null primary key,
  puzzleId text,
  title text not null,
  authorID text,
  "description" text,
  createdDate timestamp not null,
  metadata1 text, -- AI Score
  metadata2 text
);

create table "entry" (
  "entry" text not null,
  lang text not null,
  displayText text,
  primary key("entry", lang)
);

create table entryscore (
  "entry" text not null,
  lang text not null,
  obscurity_score int not null,
  quality_score int not null,
  source: text not null,
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

create table collection_clue (
  collectionId text not null,
  clueId text not null,
  "order" int not null,
  metadata1 text, -- Clue index in puzzle
  metadata2 text,
  primary key(collectionId, clueId)
);

create table translatedclue (
  id text not null primary key,
  clueId text not null,
  lang text not null,
  literalClue text not null,
  naturalClue text not null,
  source text -- which AI
);

create table translatedentry (
  "entry" text not null,
  lang text not null,
  translatedClueId int not null,
  primary key("entry", translatedClueId)
);
