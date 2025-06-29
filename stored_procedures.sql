
CREATE TYPE StrType AS (
    Str1 text NOT NULL
);

CREATE TYPE ClueType AS (
    clueId text not null,
    "order" int not null,
    metadata1 text, -- Clue index in puzzle
    "entry" text not null,
    lang text not null,
    clue text not null,
    response_template text,
    source text -- Book it came from? AI source?
);

CREATE OR REPLACE PROCEDURE AddPuzzle(
    p_puzzleId text,
    p_publicationId text,
    p_date date,
    p_author text,
    p_title text,
    p_copyright text,
    p_notes text,
    p_width integer,
    p_height integer,
    p_sourceLink text,
    p_puzData bytea
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM Puzzle 
        WHERE publicationId = p_publicationId 
        AND "date" = p_date
        AND title = p_title
    ) THEN
        INSERT INTO Puzzle (
            id,
            publicationId,
            "date",
            author,
            title,
            copyright,
            notes,
            width,
            height,
            sourceLink,
            puzData
        )
        VALUES (
            p_puzzleId,
            p_publicationId,
            p_date,
            p_author,
            p_title,
            p_copyright,
            p_notes,
            p_width,
            p_height,
            p_sourceLink,
            p_puzData
        );
    END IF;
END;
$$;

CREATE OR REPLACE PROCEDURE AddClueCollection(
    p_CollectionId text,
    p_PuzzleId text,
    p_Title text,
    p_AuthorID text,
    p_Description text,
    p_CreatedDate timestamp,
    p_Metadata1 text,
    p_Metadata2 text
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM ClueCollection 
        WHERE id = p_CollectionId
    ) THEN
        INSERT INTO ClueCollection (
            id,
            puzzleId,
            title,
            authorID,
            "description",
            createdDate,
            metadata1,
            metadata2
        )
        VALUES (
            p_CollectionId,
            p_PuzzleId,
            p_Title,
            p_AuthorID,
            p_Description,
            p_CreatedDate,
            p_Metadata1,
            p_Metadata2
        );
    END IF;
END;
$$;

CREATE OR REPLACE PROCEDURE AddCluesToCollection(
    p_CollectionId text,
    p_Clues ClueType[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert new clues
    INSERT INTO clue (id, "entry", lang, clue, response_template, source)
    SELECT cl.clueId, cl."entry", cl.lang, cl.clue, cl.response_template, cl.source 
    FROM unnest(p_Clues) AS cl

    -- Insert puzzle-clue relationships
    INSERT INTO collection_clue (collectionId, clueId, "order", metadata1)
    SELECT p_CollectionId, cl.clueId, cl."order", cl.metadata1
    FROM unnest(p_Clues) AS cl
END;
$$;
