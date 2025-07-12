CREATE OR REPLACE FUNCTION add_puzzle (
    p_puzzle_id text,
    p_publication_id text,
    p_date date,
    p_author text,
    p_title text,
    p_copyright text,
    p_notes text,
    p_width integer,
    p_height integer,
    p_source_link text
)
RETURNS void
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
            source_link
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
            p_source_link
        );
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION add_clue_collection (
    p_collection_id text,
    p_puzzle_id text,
    p_title text,
    p_author_id text,
    p_description text,
    p_created_date timestamp,
    p_metadata1 text,
    p_metadata2 text
)
RETURNS void
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
            p_description,
            p_created_date,
            p_metadata1,
            p_metadata2
        );
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION add_clues_to_collection (
    p_collection_id text,
    p_clues jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert new clues
    INSERT INTO clue (id, "entry", lang, clue, response_template, source)
    SELECT
        (cl->>'clue_id')::text,
        (cl->>'entry')::text,
        (cl->>'lang')::text,
        (cl->>'clue')::text,
        (cl->>'response_template')::text,
        (cl->>'source')::text
    FROM jsonb_array_elements(p_clues) AS cl;

    -- Insert collection-clue relationships
    INSERT INTO collection__clue (collection_id, clue_id, "order", metadata1)
    SELECT
        p_collection_id,
        (cl->>'clue_id')::text,
        (cl->>'order')::integer,
        (cl->>'metadata1')::text
    FROM jsonb_array_elements(p_clues) AS cl;
END;
$$;

CREATE OR REPLACE FUNCTION add_entries (
    p_entries jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert new entries
    INSERT INTO "entry" ("entry", lang, "length")
    SELECT
      (e->>'entry')::text,
      (e->>'lang')::text,
      (e->>'length')::integer
    FROM jsonb_array_elements(p_entries) AS e
    ON CONFLICT ("entry", lang) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION add_translate_results (
    p_translate_results jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert into translated_clue
    INSERT INTO translated_clue (clue_id, lang, literal_translation, natural_translation, source_ai)
    SELECT
        (trans->>'clue_id')::text,
        (trans->>'translated_lang')::text,
        (trans->>'literal_translation')::text,
        (trans->>'natural_translation')::text,
        (trans->>'source_ai')::text
    FROM jsonb_array_elements(p_translate_results) AS trans
    ON CONFLICT (clue_id, lang, source_ai) DO UPDATE
    SET literal_translation = EXCLUDED.literal_translation,
        natural_translation = EXCLUDED.natural_translation;

    -- Process and insert natural answers into translated_entry and entry tables
    PERFORM _process_answers(p_translate_results, 'natural_answers', 'translated_lang');

    -- Process and insert colloquial answers into translated_entry and entry tables
    PERFORM _process_answers(p_translate_results, 'colloquial_answers', 'translated_lang');

    -- Process and insert alternative English answers into translated_entry and entry tables
    PERFORM _process_answers(p_translate_results, 'alternative_english_answers', 'original_lang');

END;
$$;

CREATE OR REPLACE FUNCTION _process_answers (
    p_translate_results jsonb,
    p_answer_type text,    -- e.g., 'natural_answers', 'colloquial_answers'
    p_lang_type text       -- e.g., 'translated_lang', 'original_lang'
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert into translated_entry
    INSERT INTO translated_entry (clue_id, "entry", lang, display_text, source_ai)
    SELECT
        (trans->>'clue_id')::text,
        s.allcaps_answer,
        (trans->>p_lang_type)::text, -- Use dynamic language field
        s.display_answer,
        (trans->>'source_ai')::text
    FROM
        jsonb_array_elements(p_translate_results) AS trans
    CROSS JOIN LATERAL
        string_to_array((trans->>p_answer_type)::text, ';') AS answers_array
    CROSS JOIN LATERAL
        (
            SELECT
                answers_array[i] AS allcaps_answer,
                answers_array[i+1] AS display_answer
            FROM
                generate_series(1, array_length(answers_array, 1), 2) AS i
            WHERE
                i + 1 <= array_length(answers_array, 1)
        ) AS s
    ON CONFLICT (clue_id, "entry", lang, source_ai) DO NOTHING;

    -- Insert into "entry" table
    INSERT INTO "entry" ("entry", lang, "length", "display_text")
    SELECT
        s.allcaps_answer,
        (trans->>p_lang_type)::text, -- Use dynamic language field
        LENGTH(s.allcaps_answer),
        s.display_answer
    FROM
        jsonb_array_elements(p_translate_results) AS trans
    CROSS JOIN LATERAL
        string_to_array((trans->>p_answer_type)::text, ';') AS answers_array
    CROSS JOIN LATERAL
        (
            SELECT
                answers_array[i] AS allcaps_answer,
                answers_array[i+1] AS display_answer
            FROM
                generate_series(1, array_length(answers_array, 1), 2) AS i
            WHERE
                i + 1 <= array_length(answers_array, 1)
        ) AS s
    ON CONFLICT ("entry", lang) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION add_obscurity_quality_scores (
    p_scores jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert entry scores
    INSERT INTO entry_score ("entry", lang, obscurity_score, quality_score, source_ai)
    SELECT
        (e->>'entry')::text,
        (e->>'lang')::text,
        (e->>'obscurity_score')::integer,
        (e->>'quality_score')::integer,
        (e->>'source_ai')::text
    FROM jsonb_array_elements(p_scores) AS e
    ON CONFLICT ("entry", lang) DO UPDATE
    SET obscurity_score = EXCLUDED.obscurity_score,
        quality_score = EXCLUDED.quality_score,
        source_ai = EXCLUDED.source_ai;

    WITH avg_scores AS (
        SELECT
            es.entry,
            es.lang,
            CAST(ROUND(AVG(es.obscurity_score)) AS INTEGER) AS avg_obscurity_score,
            CAST(ROUND(AVG(es.quality_score)) AS INTEGER) AS avg_quality_score
        FROM entry_score es
        -- Join with the unnested JSON array to filter for relevant entries
        JOIN jsonb_array_elements(p_scores) AS p ON es.entry = (p->>'entry')::text AND es.lang = (p->>'lang')::text
        GROUP BY es.entry, es.lang
    )
    UPDATE entry e
    SET
        display_text = COALESCE((p->>'display_text')::text, e.display_text),
        entry_type = COALESCE((p->>'entry_type')::text, e.entry_type),
        obscurity_score = COALESCE(a.avg_obscurity_score, e.obscurity_score),
        quality_score = COALESCE(a.avg_quality_score, e.quality_score)
    FROM jsonb_array_elements(p_scores) AS p
    LEFT JOIN avg_scores a ON (p->>'entry')::text = a.entry AND (p->>'lang')::text = a.lang
    WHERE e.entry = (p->>'entry')::text
    AND e.lang = (p->>'lang')::text;
END;
$$;
