
CREATE TYPE str_type AS (
    str1 text
);

CREATE TYPE clue_type AS (
    clue_id text,
    "order" int,
    metadata1 text, -- Clue index in puzzle
    "entry" text,
    lang text,
    clue text,
    response_template text,
    source text -- Book it came from? AI source?
);

CREATE TYPE entry_type AS (
    "entry" text,
    lang text
);

CREATE TYPE translated_type AS (
    translated_clue_id text,
    clue_id text,
    lang text,
    literal_translation text,
    natural_translation text,
    natural_answers text,
    colloquial_answers text,
    source_ai text -- Which AI provided the translation
);

CREATE TYPE obscurity_quality_type AS (
    "entry" text,
    lang text,
    display_text text,
    entry_type text,
    obscurity_score integer,
    quality_score integer,
    source text -- which AI
);

CREATE OR REPLACE PROCEDURE add_puzzle (
    p_puzzle_id text,
    p_publication_id text,
    p_date date,
    p_author text,
    p_title text,
    p_copyright text,
    p_notes text,
    p_width integer,
    p_height integer,
    p_source_link text,
    p_puz_data bytea
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM puzzle 
        WHERE publication_id = p_publication_id 
        AND "date" = p_date
        AND title = p_title
    ) THEN
        INSERT INTO puzzle (
            id,
            publication_id,
            "date",
            author,
            title,
            copyright,
            notes,
            width,
            height,
            source_link,
            puz_data
        )
        VALUES (
            p_puzzle_id,
            p_publication_id,
            p_date,
            p_author,
            p_title,
            p_copyright,
            p_notes,
            p_width,
            p_height,
            p_source_link,
            p_puz_data
        );
    END IF;
END;
$$;

CREATE OR REPLACE PROCEDURE add_clue_collection (
    p_collection_id text,
    p_puzzle_id text,
    p_title text,
    p_author_id text,
    p_description text,
    p_created_date timestamp,
    p_metadata1 text,
    p_metadata2 text
)
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM clue_collection
        WHERE id = p_collection_id
    ) THEN
        INSERT INTO clue_collection (
            id,
            puzzle_id,
            title,
            author_id,
            "description",
            created_date,
            metadata1,
            metadata2
        )
        VALUES (
            p_collection_id,
            p_puzzle_id,
            p_title,
            p_author_id,
            p_dscription,
            p_created_date,
            p_metadata1,
            p_metadata2
        );
    END IF;
END;
$$;

CREATE OR REPLACE PROCEDURE add_clues_to_collection (
    p_collection_id text,
    p_clues clue_type[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert new clues
    INSERT INTO clue (id, "entry", lang, clue, response_template, source)
    SELECT cl.clue_id, cl."entry", cl.lang, cl.clue, cl.response_template, cl.source 
    FROM unnest(p_clues) AS cl;

    -- Insert puzzle-clue relationships
    INSERT INTO collection__clue (collection_id, clue_id, "order", metadata1)
    SELECT p_collection_id, cl.clue_id, cl."order", cl.metadata1
    FROM unnest(p_clues) AS cl;
END;
$$;

CREATE OR REPLACE PROCEDURE add_entries (
    p_entries entry_type[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert new entries
    INSERT INTO "entry" ("entry", lang)
    SELECT e."entry", e.lang
    FROM unnest(p_entries) AS e
    ON CONFLICT ("entry", lang) DO NOTHING;
END;
$$;

CREATE OR REPLACE PROCEDURE add_translate_results (
    p_translate_results translated_type[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert natural answers using UNNEST to process arrays in bulk
    INSERT INTO translated_clue (id, clue_id, lang, literal_clue, natural_clue, source_ai)
    SELECT
        trans.translated_clue_id,
        trans.clue_id,
        trans.lang,
        trans.literal_clue,
        trans.natural_clue,
        trans.source_ai
    FROM unnest(p_translate_results) AS trans
    ON CONFLICT (clue_id, lang, source) DO UPDATE
    SET literal_clue = EXCLUDED.literal_clue,
        natural_clue = EXCLUDED.natural_clue;

    -- Insert natural answers using UNNEST to process arrays in bulk
    INSERT INTO translated_entry ("entry", lang, display_text, translated_clue_id)
    SELECT
        unnest_answer[1],
        trans.lang,
        unnest_answer[2],
        trans.translated_clue_id
    FROM unnest(p_translate_results) AS trans
    CROSS JOIN LATERAL unnest(string_to_array(trans.natural_answers, ';')) WITH ORDINALITY AS unnest_answer(answer, idx)
    WHERE unnest_answer.idx % 2 = 1
    AND array_length(string_to_array(trans.natural_answers, ';'), 1) >= unnest_answer.idx + 1
    ON CONFLICT ("entry", translated_clue_id) DO NOTHING;

    -- Insert colloquial answers using UNNEST to process arrays in bulk
    INSERT INTO translated_entry ("entry", lang, display_text, translated_clue_id)
    SELECT
        unnest_answer[1],
        trans.lang,
        unnest_answer[2],
        trans.translated_clue_id
    FROM unnest(p_translate_results) AS trans
    CROSS JOIN LATERAL unnest(string_to_array(trans.colloquial_answers, ';')) WITH ORDINALITY AS unnest_answer(answer, idx)
    WHERE unnest_answer.idx % 2 = 1
    AND array_length(string_to_array(trans.colloquial_answers, ';'), 1) >= unnest_answer.idx + 1
    ON CONFLICT ("entry", translated_clue_id) DO NOTHING;

    -- Insert natural translations as entries
    INSERT INTO "entry" ("entry", lang)
    SELECT
        unnest_answer[1],
        trans.lang
    FROM unnest(p_translate_results) AS trans
    CROSS JOIN LATERAL unnest(string_to_array(trans.natural_answers, ';')) WITH ORDINALITY AS unnest_answer(answer, idx)
    WHERE unnest_answer.idx % 2 = 1
    AND array_length(string_to_array(trans.natural_answers, ';'), 1) >= unnest_answer.idx + 1
    ON CONFLICT ("entry", lang) DO NOTHING;

    -- Insert colloquial translations as entries
    INSERT INTO "entry" ("entry", lang)
    SELECT
        unnest_answer[1],
        trans.lang
    FROM unnest(p_translate_results) AS trans
    CROSS JOIN LATERAL unnest(string_to_array(trans.colloquial_answers, ';')) WITH ORDINALITY AS unnest_answer(answer, idx)
    WHERE unnest_answer.idx % 2 = 1
    AND array_length(string_to_array(trans.colloquial_answers, ';'), 1) >= unnest_answer.idx + 1
    ON CONFLICT ("entry", lang) DO NOTHING;
END;
$$;

CREATE OR REPLACE PROCEDURE add_obscurity_quality_scores (
    p_scores obscurity_quality_type[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert entry scores
    INSERT INTO entry_score ("entry", lang, obscurity_score, quality_score, source_ai) 
    SELECT e."entry", e.lang, e.obscurity_score, e.quality_score, e.source_ai
    FROM unnest(p_scores) AS e
    ON CONFLICT ("entry", lang) DO UPDATE
    SET obscurity_score = EXCLUDED.obscurity_score,
        quality_score = EXCLUDED.quality_score,
        source = EXCLUDED.source;

    WITH avg_scores AS (
      SELECT 
          es.entry,
          es.lang,
          CAST(ROUND(AVG(es.obscurity_score)) AS INTEGER) AS avg_obscurity_score,
          CAST(ROUND(AVG(es.quality_score)) AS INTEGER) AS avg_quality_score
      FROM entry_score es
      JOIN unnest(p_scores) AS p ON es.entry = p.entry AND es.lang = p.lang
      GROUP BY es.entry, es.lang
    )

    UPDATE entry e
    SET 
        display_text = COALESCE(p.display_text, e.display_text),
        entry_type = COALESCE(p.entry_type, e.entry_type),
        obscurity_score = COALESCE(a.avg_obscurity_score, e.obscurity_score),
        quality_score = COALESCE(a.avg_quality_score, e.quality_score)
    FROM unnest(p_scores) AS p
    LEFT JOIN avg_scores a ON p.entry = a.entry AND p.lang = a.lang
    WHERE e.entry = p.entry 
    AND e.lang = p.lang;

    SELECT "entry", lang, display_text, entry_type, obscurity_score, quality_score
    FROM entry
    WHERE ("entry", lang) IN (
        SELECT "entry", lang
        FROM unnest(p_scores) AS p
    );
END;
$$;
