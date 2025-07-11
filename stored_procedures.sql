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
    -- Insert natural answers using UNNEST to process arrays in bulk
    INSERT INTO translated_clue (clue_id, lang, literal_translation, natural_translation, source_ai)
    SELECT
        (trans->>'clue_id')::text,
        (trans->>'translated_lang')::text,
        (trans->>'literal_translation')::text,
        (trans->>'natural_translation')::text,
        (trans->>'source_ai')::text
    FROM jsonb_array_elements(p_translate_results) AS trans
    ON CONFLICT (clue_id, lang, source_ai) DO UPDATE -- Note: changed 'source' to 'source_ai' based on the input function
    SET literal_translation = EXCLUDED.literal_translation,
        natural_translation = EXCLUDED.natural_translation;

    -- Insert natural answers using UNNEST to process arrays in bulk
    INSERT INTO translated_entry ("entry", lang, display_text, translated_clue_id)
    SELECT
        unnest_answer[1],
        (trans->>'translated_lang')::text,
        unnest_answer[2],
        (trans->>'translated_clue_id')::text
    FROM jsonb_array_elements(p_translate_results) AS trans
    CROSS JOIN LATERAL unnest(string_to_array((trans->>'natural_answers')::text, ';')) WITH ORDINALITY AS unnest_answer(allcaps, answer)
    WHERE unnest_answer.idx % 2 = 1
    AND array_length(string_to_array((trans->>'natural_answers')::text, ';'), 1) >= unnest_answer.idx + 1
    ON CONFLICT ("entry", translated_clue_id) DO NOTHING;

    -- Insert colloquial answers using UNNEST to process arrays in bulk
    INSERT INTO translated_entry ("entry", lang, display_text, translated_clue_id)
    SELECT
        unnest_answer[1],
        (trans->>'translated_lang')::text,
        unnest_answer[2],
        (trans->>'translated_clue_id')::text
    FROM jsonb_array_elements(p_translate_results) AS trans
    CROSS JOIN LATERAL unnest(string_to_array((trans->>'colloquial_answers')::text, ';')) WITH ORDINALITY AS unnest_answer(answer, idx)
    WHERE unnest_answer.idx % 2 = 1
    AND array_length(string_to_array((trans->>'colloquial_answers')::text, ';'), 1) >= unnest_answer.idx + 1
    ON CONFLICT ("entry", translated_clue_id) DO NOTHING;

    -- Alternative English answers using UNNEST to process arrays in bulk
    INSERT INTO translated_entry ("entry", lang, display_text, translated_clue_id)
    SELECT
        unnest_answer[1],
        (trans->>'original_lang')::text,
        unnest_answer[2],
        (trans->>'translated_clue_id')::text
    FROM jsonb_array_elements(p_translate_results) AS trans
    CROSS JOIN LATERAL unnest(string_to_array((trans->>'alternative_english_answers')::text, ';')) WITH ORDINALITY AS unnest_answer(answer, idx)
    WHERE unnest_answer.idx % 2 = 1
    AND array_length(string_to_array((trans->>'alternative_english_answers')::text, ';'), 1) >= unnest_answer.idx + 1
    ON CONFLICT ("entry", translated_clue_id) DO NOTHING;

    -- Insert natural translations as entries
    INSERT INTO "entry" ("entry", lang, "display_text")
    SELECT
        unnest_answer[1],
        (trans->>'translated_lang')::text,
        unnest_answer[2]
    FROM jsonb_array_elements(p_translate_results) AS trans
    CROSS JOIN LATERAL unnest(string_to_array((trans->>'natural_answers')::text, ';')) WITH ORDINALITY AS unnest_answer(answer, idx)
    WHERE unnest_answer.idx % 2 = 1
    AND array_length(string_to_array((trans->>'natural_answers')::text, ';'), 1) >= unnest_answer.idx + 1
    ON CONFLICT ("entry", lang) DO NOTHING;

    -- Insert colloquial translations as entries
    INSERT INTO "entry" ("entry", lang, "display_text")
    SELECT
        unnest_answer[1],
        (trans->>'translated_lang')::text,
        unnest_answer[2]
    FROM jsonb_array_elements(p_translate_results) AS trans
    CROSS JOIN LATERAL unnest(string_to_array((trans->>'colloquial_answers')::text, ';')) WITH ORDINALITY AS unnest_answer(answer, idx)
    WHERE unnest_answer.idx % 2 = 1
    AND array_length(string_to_array((trans->>'colloquial_answers')::text, ';'), 1) >= unnest_answer.idx + 1
    ON CONFLICT ("entry", lang) DO NOTHING;

    -- Insert alternative English answers as entries
    INSERT INTO "entry" ("entry", lang, "display_text")
    SELECT
        unnest_answer[1],
        (trans->>'original_lang')::text,
        unnest_answer[2]
    FROM jsonb_array_elements(p_translate_results) AS trans
    CROSS JOIN LATERAL unnest(string_to_array((trans->>'alternative_english_answers')::text, ';')) WITH ORDINALITY AS unnest_answer(answer, idx)
    WHERE unnest_answer.idx % 2 = 1
    AND array_length(string_to_array((trans->>'alternative_english_answers')::text, ';'), 1) >= unnest_answer.idx + 1
    ON CONFLICT ("entry", lang) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION add_obscurity_quality_scores (
    p_scores jsonb
)
RETURNS TABLE (
    "entry" text,
    lang text,
    display_text text,
    entry_type text,
    obscurity_score integer,
    quality_score integer
)
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
        source_ai = EXCLUDED.source_ai; -- Corrected 'source' to 'source_ai'

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

    RETURN QUERY
    SELECT "entry", lang, display_text, entry_type, obscurity_score, quality_score
    FROM entry
    WHERE ("entry", lang) IN (
        SELECT (p->>'entry')::text, (p->>'lang')::text
        FROM jsonb_array_elements(p_scores) AS p
    );
END;
$$;
