--
-- PostgreSQL database dump
--

\restrict kxYUqGVdsnTb9VOVTUuFzIbVZxWXoymWghK3ca72GRiUFXoYHXS65q5QubrFy4c

-- Dumped from database version 14.18
-- Dumped by pg_dump version 18.0

-- Started on 2026-01-01 23:27:40

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 6 (class 2615 OID 24859)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 3554 (class 0 OID 0)
-- Dependencies: 6
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- TOC entry 2 (class 3079 OID 25080)
-- Name: pldbgapi; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pldbgapi WITH SCHEMA public;


--
-- TOC entry 3556 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pldbgapi; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pldbgapi IS 'server-side support for debugging PL/pgSQL functions';


--
-- TOC entry 287 (class 1255 OID 25340)
-- Name: add_clue_to_collection(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_clue_to_collection(clue_data jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_next_order int;
BEGIN
    -- Get the next order number for this collection
    SELECT COALESCE(MAX("order"), 0) + 1
    INTO v_next_order
    FROM collection__clue
    WHERE collection_id = clue_data->>'collection_id';

    -- Insert into clue table
    INSERT INTO clue (id, entry, lang, sense_id, custom_clue, custom_display_text, source)
    VALUES (
        clue_data->>'id',
        clue_data->>'entry',
        clue_data->>'lang',
        NULL, -- sense_id will be determined later or can be updated
        clue_data->>'custom_clue',
        clue_data->>'custom_display_text',
        clue_data->>'source'
    );

    -- Insert into collection__clue table
    INSERT INTO collection__clue (collection_id, clue_id, "order", metadata1, metadata2)
    VALUES (
        clue_data->>'collection_id',
        clue_data->>'id',
        v_next_order,
        NULL,
        NULL
    );

    -- Increment the clue count for the collection
    UPDATE clue_collection
    SET clue_count = clue_count + 1
    WHERE id = clue_data->>'collection_id';
END;
$$;


ALTER FUNCTION public.add_clue_to_collection(clue_data jsonb) OWNER TO postgres;

--
-- TOC entry 291 (class 1255 OID 25355)
-- Name: add_example_sentence_queue_entries(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_example_sentence_queue_entries(p_sense_ids jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_sense_id text; -- Renamed local variable
BEGIN
    -- Process each sense_id
    FOR v_sense_id IN SELECT * FROM jsonb_array_elements_text(p_sense_ids)
    LOOP
        -- Check if this sense already has 3 or more example sentences
        IF (SELECT COUNT(*) FROM example_sentence es WHERE es.sense_id = v_sense_id) < 3 THEN
            INSERT INTO example_sentence_queue (sense_id)
            VALUES (v_sense_id)
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END;
$$;


ALTER FUNCTION public.add_example_sentence_queue_entries(p_sense_ids jsonb) OWNER TO postgres;

--
-- TOC entry 308 (class 1255 OID 25364)
-- Name: add_example_sentences(text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_example_sentences(p_sense_id text, p_example_sentences jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    sentence_record jsonb;
    example_id text;
    lang text;
    sentence_text text;
BEGIN
    -- Process each example sentence
    FOR sentence_record IN SELECT * FROM jsonb_array_elements(p_example_sentences)
    LOOP
        -- Generate a new ID for the example sentence
        example_id := gen_random_uuid()::text;

        -- Insert the example sentence
        INSERT INTO example_sentence (id, sense_id)
        VALUES (example_id, p_sense_id);

        -- Insert translations for each language
        FOR lang, sentence_text IN SELECT key, value FROM jsonb_each_text(sentence_record->'translations')
        LOOP
            INSERT INTO example_sentence_translation (example_id, lang, sentence)
            VALUES (example_id, lang, sentence_text);
        END LOOP;
    END LOOP;
END;
$$;


ALTER FUNCTION public.add_example_sentences(p_sense_id text, p_example_sentences jsonb) OWNER TO postgres;

--
-- TOC entry 306 (class 1255 OID 25361)
-- Name: add_sense_entry_translations(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_sense_entry_translations(p_translations jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Insert sense entry translations
    INSERT INTO sense_entry_translation (sense_id, "entry", lang, display_text)
    SELECT
      (t->>'sense_id')::text,
      (t->>'entry')::text,
      (t->>'lang')::text,
      (t->>'display_text')::text
    FROM jsonb_array_elements(p_translations) AS t
    ON CONFLICT (sense_id, "entry", lang) DO NOTHING;
END;
$$;


ALTER FUNCTION public.add_sense_entry_translations(p_translations jsonb) OWNER TO postgres;

--
-- TOC entry 299 (class 1255 OID 25339)
-- Name: add_to_entry_info_queue(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_to_entry_info_queue(p_entry text, p_lang text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Insert the entry and the provided language into the entry_info_queue table.
    INSERT INTO entry_info_queue ("entry", lang)
    VALUES (p_entry, p_lang);
END;
$$;


ALTER FUNCTION public.add_to_entry_info_queue(p_entry text, p_lang text) OWNER TO postgres;

--
-- TOC entry 296 (class 1255 OID 25323)
-- Name: add_to_entry_queue(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_to_entry_queue(p_entry text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Variable to store the language found in the entry table
    v_lang text;
BEGIN
    -- Query the entry table to find the language for the given entry.
    SELECT lang INTO v_lang
    FROM entry
    WHERE "entry" = p_entry
    LIMIT 1;

    -- If a language was found, proceed with the insertion.
    IF v_lang IS NOT NULL THEN
        -- Insert the entry and the found language into the entry_info_queue table.
        INSERT INTO entry_info_queue ("entry", lang)
        VALUES (p_entry, v_lang);
    END IF;
END;
$$;


ALTER FUNCTION public.add_to_entry_queue(p_entry text) OWNER TO postgres;

--
-- TOC entry 304 (class 1255 OID 25359)
-- Name: add_translate_results(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_translate_results(p_translate_results jsonb) RETURNS void
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

    -- Process and insert alternative answers into translated_entry and entry tables
    PERFORM _process_answers(p_translate_results, 'alternative_answers', 'original_lang');

END;
$$;


ALTER FUNCTION public.add_translate_results(p_translate_results jsonb) OWNER TO postgres;

--
-- TOC entry 294 (class 1255 OID 25667)
-- Name: assign_primary_sense_to_clues(text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.assign_primary_sense_to_clues(p_entry text, p_lang text, p_primary_sense_id text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update clues that have the specified entry and lang,
    -- but no sense_id and no custom_clue, to use the primary sense_id
    UPDATE clue
    SET sense_id = p_primary_sense_id
    WHERE "entry" = p_entry
      AND lang = p_lang
      AND sense_id IS NULL
      AND custom_clue IS NULL;
END;
$$;


ALTER FUNCTION public.assign_primary_sense_to_clues(p_entry text, p_lang text, p_primary_sense_id text) OWNER TO postgres;

--
-- TOC entry 289 (class 1255 OID 25342)
-- Name: get_clue_by_entry_in_collection(text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_clue_by_entry_in_collection(p_collection_id text, p_entry text, p_lang text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_array(
        jsonb_build_object(
            'id', c.id,
            'entry', c.entry,
            'lang', c.lang,
            'sense_id', c.sense_id,
            'custom_clue', c.custom_clue,
            'custom_display_text', c.custom_display_text,
            'source', c.source,
            'translated_clues', NULL -- This might need to be populated based on schema
        )
    )
    INTO result
    FROM clue c
    JOIN collection__clue cc ON c.id = cc.clue_id
    WHERE cc.collection_id = p_collection_id
    AND c.entry = p_entry
    AND c.lang = p_lang
    LIMIT 1;

    -- If no result found, return empty array
    IF result IS NULL THEN
        RETURN jsonb_build_array();
    END IF;

    RETURN result;
END;
$$;


ALTER FUNCTION public.get_clue_by_entry_in_collection(p_collection_id text, p_entry text, p_lang text) OWNER TO postgres;

--
-- TOC entry 281 (class 1255 OID 25156)
-- Name: get_clue_collections(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_clue_collections(p_user_id text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'title', c.title,
                'lang', c.lang,
                'author', c.author,
                'description', c.description,
                'is_private', c.is_private,
                'created_date', c.created_date,
                'metadata1', c.metadata1,
                'metadata2', c.metadata2,
                'clue_count', c.clue_count,
                'creator', CASE WHEN u.id IS NOT NULL
                                THEN jsonb_build_object(
                                    'creator_id', u.id,
                                    'creator_first_name', u.first_name,
                                    'creator_last_name', u.last_name
                                )
                                ELSE NULL
                          END,
                'user_progress', CASE WHEN p_user_id IS NOT NULL AND uc.user_id IS NOT NULL THEN
                        jsonb_build_object(
                            'unseen', uc.unseen,
                            'in_progress', uc.in_progress,
                            'completed', uc.completed
                        )
                    ELSE
                        NULL
                END
            )
        )
        FROM clue_collection c
        LEFT JOIN "user" u ON c.creator_id = u.id
        LEFT JOIN user__collection uc ON c.id = uc.collection_id AND uc.user_id = p_user_id
        LEFT JOIN collection_access ca ON c.id = ca.collection_id AND ca.user_id = p_user_id
        WHERE (p_user_id IS NULL AND c.is_private = FALSE) 
           OR (p_user_id IS NOT NULL AND (c.is_private = FALSE OR c.creator_id = p_user_id OR ca.user_id IS NOT NULL))
    );
END;
$$;


ALTER FUNCTION public.get_clue_collections(p_user_id text) OWNER TO postgres;

--
-- TOC entry 303 (class 1255 OID 25338)
-- Name: get_clues(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_clues(p_collection_id text, p_user_id text DEFAULT NULL::text) RETURNS TABLE(clues_json jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'entry', c.entry,
                'lang', c.lang,
                'loading_status', e.loading_status,
                'clue', c.custom_clue,
                'source', c.source,
                'collection_order', cc.order,
                'metadata1', cc.metadata1,
                'metadata2', cc.metadata2,
                'user_progress', CASE
                    WHEN p_user_id IS NOT NULL THEN
                        jsonb_build_object(
                            'total_solves', uc.correct_solves + uc.incorrect_solves,
                            'correct_solves', uc.correct_solves,
                            'incorrect_solves', uc.incorrect_solves,
                            'last_solve', uc.last_solve
                        )
                    ELSE
                        NULL
                END
            )
            ORDER BY cc.order ASC
        ) AS clues_json
    FROM
        collection__clue cc
    JOIN
        clue c ON cc.clue_id = c.id
    LEFT JOIN
        entry e ON c.entry = e.entry AND c.lang = e.lang
    LEFT JOIN
        user__clue uc ON c.id = uc.clue_id AND uc.user_id = p_user_id
    WHERE
        cc.collection_id = p_collection_id;
END;
$$;


ALTER FUNCTION public.get_clues(p_collection_id text, p_user_id text) OWNER TO postgres;

--
-- TOC entry 241 (class 1255 OID 25158)
-- Name: get_collection_batch(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_collection_batch(p_collection_id text, p_user_id text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    result_json JSONB;
    unseen_clues JSONB;
    seen_clues JSONB;
    batch_size INTEGER := 20;
    unseen_count INTEGER := 13;
    seen_count INTEGER := 7;
    total_unseen INTEGER;
    total_seen INTEGER;
    clues_seen_24h INTEGER;
    total_clues INTEGER;
    all_mastered BOOLEAN := FALSE;
BEGIN
    -- If no user is provided, return randomized clues from all clues in the collection
    IF p_user_id IS NULL THEN
        WITH clue_data AS (
            SELECT 
                c.id,
                c.entry,
                c.lang,
                c.sense_id,
                c.custom_clue,
                c.custom_display_text,
                c.source,
                s.id as sense_id_full,
                s.part_of_speech,
                s.commonness,
                s.familiarity_score,
                s.quality_score,
                s.source_ai,
                -- Get sense translations
                COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'lang', st.lang,
                            'summary', st.summary,
                            'definition', st.definition
                        )
                    ) FILTER (WHERE st.lang IS NOT NULL),
                    '[]'::jsonb
                ) as sense_translations,
                -- Get example sentences
                COALESCE(
                    jsonb_agg(
                        jsonb_build_object(
                            'id', es.id,
                            'sentence', est.sentence,
                            'lang', est.lang
                        )
                    ) FILTER (WHERE es.id IS NOT NULL),
                    '[]'::jsonb
                ) as example_sentences
            FROM clue c
            INNER JOIN collection__clue cc ON c.id = cc.clue_id
            LEFT JOIN sense s ON c.sense_id = s.id
            LEFT JOIN sense_translation st ON s.id = st.sense_id
            LEFT JOIN example_sentence es ON s.id = es.sense_id
            LEFT JOIN example_sentence_translation est ON es.id = est.example_id
            WHERE cc.collection_id = p_collection_id
            GROUP BY c.id, c.entry, c.lang, c.sense_id, c.custom_clue, c.custom_display_text, c.source,
                     s.id, s.part_of_speech, s.commonness, s.familiarity_score, s.quality_score, s.source_ai
        )
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', cd.id,
                'entry', cd.entry,
                'lang', cd.lang,
                'sense_id', cd.sense_id,
                'custom_clue', cd.custom_clue,
                'custom_display_text', cd.custom_display_text,
                'source', cd.source,
                'sense', CASE 
                    WHEN cd.sense_id IS NOT NULL THEN
                        jsonb_build_object(
                            'id', cd.sense_id_full,
                            'partOfSpeech', cd.part_of_speech,
                            'commonness', cd.commonness,
                            'summary', NULL, -- Will be populated from translations
                            'definition', NULL, -- Will be populated from translations
                            'exampleSentences', cd.example_sentences,
                            'translations', cd.sense_translations,
                            'familiarityScore', cd.familiarity_score,
                            'qualityScore', cd.quality_score,
                            'sourceAi', cd.source_ai
                        )
                    ELSE NULL
                END
            ) ORDER BY random()
        )
        INTO result_json
        FROM clue_data cd
        LIMIT batch_size;
        
        RETURN COALESCE(result_json, '[]'::jsonb);
    END IF;

    -- Check if all clues are mastered
    SELECT COUNT(*) = 0 INTO all_mastered
    FROM clue c
    INNER JOIN collection__clue cc ON c.id = cc.clue_id
    LEFT JOIN user__clue uc ON c.id = uc.clue_id AND uc.user_id = p_user_id
    WHERE cc.collection_id = p_collection_id
    AND (uc.correct_solves IS NULL OR uc.correct_solves < uc.correct_solves_needed);

    -- Count clues seen in the past 24 hours
    SELECT COUNT(*) INTO clues_seen_24h
    FROM clue c
    INNER JOIN collection__clue cc ON c.id = cc.clue_id
    INNER JOIN user__clue uc ON c.id = uc.clue_id
    WHERE cc.collection_id = p_collection_id
    AND uc.user_id = p_user_id
    AND uc.last_solve >= NOW() - INTERVAL '24 hours';

    -- Get total clues count
    SELECT COUNT(*) INTO total_clues
    FROM clue c
    INNER JOIN collection__clue cc ON c.id = cc.clue_id
    WHERE cc.collection_id = p_collection_id;

    -- If all clues have been seen in the past 24 hours, return empty batch
    IF clues_seen_24h >= total_clues THEN
        RETURN '[]'::jsonb;
    END IF;

    -- Get unseen clues (clues user has never seen or not mastered)
    WITH clue_data AS (
        SELECT 
            c.id,
            c.entry,
            c.lang,
            c.sense_id,
            c.custom_clue,
            c.custom_display_text,
            c.source,
            s.id as sense_id_full,
            s.part_of_speech,
            s.commonness,
            s.familiarity_score,
            s.quality_score,
            s.source_ai,
            uc.correct_solves,
            uc.incorrect_solves,
            uc.last_solve,
            uc.correct_solves_needed,
            -- Get sense translations
            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'lang', st.lang,
                        'summary', st.summary,
                        'definition', st.definition
                    )
                ) FILTER (WHERE st.lang IS NOT NULL),
                '[]'::jsonb
            ) as sense_translations,
            -- Get example sentences
            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', es.id,
                        'sentence', est.sentence,
                        'lang', est.lang
                    )
                ) FILTER (WHERE es.id IS NOT NULL),
                '[]'::jsonb
            ) as example_sentences
        FROM clue c
        INNER JOIN collection__clue cc ON c.id = cc.clue_id
        LEFT JOIN sense s ON c.sense_id = s.id
        LEFT JOIN sense_translation st ON s.id = st.sense_id
        LEFT JOIN example_sentence es ON s.id = es.sense_id
        LEFT JOIN example_sentence_translation est ON es.id = est.example_id
        LEFT JOIN user__clue uc ON c.id = uc.clue_id AND uc.user_id = p_user_id
        WHERE cc.collection_id = p_collection_id
        AND (uc.user_id IS NULL OR uc.last_solve IS NULL OR (uc.correct_solves IS NULL OR uc.correct_solves < uc.correct_solves_needed))
        AND (all_mastered OR uc.correct_solves IS NULL OR uc.correct_solves < uc.correct_solves_needed)
        GROUP BY c.id, c.entry, c.lang, c.sense_id, c.custom_clue, c.custom_display_text, c.source,
                 s.id, s.part_of_speech, s.commonness, s.familiarity_score, s.quality_score, s.source_ai,
                 uc.correct_solves, uc.incorrect_solves, uc.last_solve, uc.correct_solves_needed
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', cd.id,
            'entry', cd.entry,
            'lang', cd.lang,
            'sense_id', cd.sense_id,
            'custom_clue', cd.custom_clue,
            'custom_display_text', cd.custom_display_text,
            'source', cd.source,
            'sense', CASE 
                WHEN cd.sense_id IS NOT NULL THEN
                    jsonb_build_object(
                        'id', cd.sense_id_full,
                        'partOfSpeech', cd.part_of_speech,
                        'commonness', cd.commonness,
                        'summary', NULL, -- Will be populated from translations
                        'definition', NULL, -- Will be populated from translations
                        'exampleSentences', cd.example_sentences,
                        'translations', cd.sense_translations,
                        'familiarityScore', cd.familiarity_score,
                        'qualityScore', cd.quality_score,
                        'sourceAi', cd.source_ai
                    )
                ELSE NULL
            END,
            'progress_data', jsonb_build_object(
                'total_solves', COALESCE(cd.correct_solves, 0) + COALESCE(cd.incorrect_solves, 0),
                'correct_solves', COALESCE(cd.correct_solves, 0),
                'incorrect_solves', COALESCE(cd.incorrect_solves, 0),
                'last_solve', cd.last_solve
            )
        ) ORDER BY COALESCE(cd.last_solve, '1900-01-01'::date) ASC
    )
    INTO unseen_clues
    FROM clue_data cd;

    -- Get seen clues (clues user has seen but not mastered, not seen in past 24 hours)
    WITH clue_data AS (
        SELECT 
            c.id,
            c.entry,
            c.lang,
            c.sense_id,
            c.custom_clue,
            c.custom_display_text,
            c.source,
            s.id as sense_id_full,
            s.part_of_speech,
            s.commonness,
            s.familiarity_score,
            s.quality_score,
            s.source_ai,
            uc.correct_solves,
            uc.incorrect_solves,
            uc.last_solve,
            uc.correct_solves_needed,
            -- Get sense translations
            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'lang', st.lang,
                        'summary', st.summary,
                        'definition', st.definition
                    )
                ) FILTER (WHERE st.lang IS NOT NULL),
                '[]'::jsonb
            ) as sense_translations,
            -- Get example sentences
            COALESCE(
                jsonb_agg(
                    jsonb_build_object(
                        'id', es.id,
                        'sentence', est.sentence,
                        'lang', est.lang
                    )
                ) FILTER (WHERE es.id IS NOT NULL),
                '[]'::jsonb
            ) as example_sentences
        FROM clue c
        INNER JOIN collection__clue cc ON c.id = cc.clue_id
        LEFT JOIN sense s ON c.sense_id = s.id
        LEFT JOIN sense_translation st ON s.id = st.sense_id
        LEFT JOIN example_sentence es ON s.id = es.sense_id
        LEFT JOIN example_sentence_translation est ON es.id = est.example_id
        INNER JOIN user__clue uc ON c.id = uc.clue_id
        WHERE cc.collection_id = p_collection_id
        AND uc.user_id = p_user_id
        AND uc.last_solve IS NOT NULL
        AND uc.last_solve < NOW() - INTERVAL '24 hours'
        AND (all_mastered OR uc.correct_solves IS NULL OR uc.correct_solves < uc.correct_solves_needed)
        GROUP BY c.id, c.entry, c.lang, c.sense_id, c.custom_clue, c.custom_display_text, c.source,
                 s.id, s.part_of_speech, s.commonness, s.familiarity_score, s.quality_score, s.source_ai,
                 uc.correct_solves, uc.incorrect_solves, uc.last_solve, uc.correct_solves_needed
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', cd.id,
            'entry', cd.entry,
            'lang', cd.lang,
            'sense_id', cd.sense_id,
            'custom_clue', cd.custom_clue,
            'custom_display_text', cd.custom_display_text,
            'source', cd.source,
            'sense', CASE 
                WHEN cd.sense_id IS NOT NULL THEN
                    jsonb_build_object(
                        'id', cd.sense_id_full,
                        'partOfSpeech', cd.part_of_speech,
                        'commonness', cd.commonness,
                        'summary', NULL, -- Will be populated from translations
                        'definition', NULL, -- Will be populated from translations
                        'exampleSentences', cd.example_sentences,
                        'translations', cd.sense_translations,
                        'familiarityScore', cd.familiarity_score,
                        'qualityScore', cd.quality_score,
                        'sourceAi', cd.source_ai
                    )
                ELSE NULL
            END,
            'progress_data', jsonb_build_object(
                'total_solves', COALESCE(cd.correct_solves, 0) + COALESCE(cd.incorrect_solves, 0),
                'correct_solves', COALESCE(cd.correct_solves, 0),
                'incorrect_solves', COALESCE(cd.incorrect_solves, 0),
                'last_solve', cd.last_solve
            )
        ) ORDER BY COALESCE(cd.last_solve, '1900-01-01'::date) ASC
    )
    INTO seen_clues
    FROM clue_data cd;

    -- Count available clues
    SELECT 
        COALESCE(jsonb_array_length(unseen_clues), 0),
        COALESCE(jsonb_array_length(seen_clues), 0)
    INTO total_unseen, total_seen;

    -- Adjust counts based on availability with improved logic
    IF total_seen < seen_count THEN
        -- If fewer than 7 seen clues, fill remaining slots with unseen clues
        seen_count := total_seen;
        unseen_count := LEAST(batch_size - seen_count, total_unseen);
    ELSIF total_unseen < unseen_count THEN
        -- If fewer than 13 unseen clues, fill remaining slots with seen clues
        unseen_count := total_unseen;
        seen_count := LEAST(batch_size - unseen_count, total_seen);
    END IF;

    -- Combine and randomize the batch
    WITH unseen_sample AS (
        SELECT value FROM jsonb_array_elements(COALESCE(unseen_clues, '[]'::jsonb)) LIMIT unseen_count
    ),
    seen_sample AS (
        SELECT value FROM jsonb_array_elements(COALESCE(seen_clues, '[]'::jsonb)) LIMIT seen_count
    )
    SELECT jsonb_agg(value ORDER BY random())
    INTO result_json
    FROM (
        SELECT value FROM unseen_sample
        UNION ALL
        SELECT value FROM seen_sample
    ) AS combined;

    RETURN COALESCE(result_json, '[]'::jsonb);
END;
$$;


ALTER FUNCTION public.get_collection_batch(p_collection_id text, p_user_id text) OWNER TO postgres;

--
-- TOC entry 286 (class 1255 OID 25344)
-- Name: get_collection_by_id(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_collection_by_id(p_collection_id text, p_user_id text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN (
        SELECT jsonb_build_object(
            'id', c.id,
            'title', c.title,
            'lang', c.lang,
            'author', c.author,
            'description', c.description,
            'is_private', c.is_private,
            'created_date', c.created_date,
            'modified_date', c.modified_date,
            'metadata1', c.metadata1,
            'metadata2', c.metadata2,
            'clue_count', c.clue_count,
            'creator', CASE WHEN u.id IS NOT NULL
                            THEN jsonb_build_object(
                                'creator_id', u.id,
                                'creator_first_name', u.first_name,
                                'creator_last_name', u.last_name
                            )
                            ELSE NULL
                      END,
            'user_progress', CASE WHEN p_user_id IS NOT NULL AND uc.user_id IS NOT NULL THEN
                    jsonb_build_object(
                        'unseen', uc.unseen,
                        'in_progress', uc.in_progress,
                        'completed', uc.completed
                    )
                ELSE
                    NULL
            END
        )
        FROM clue_collection c
        LEFT JOIN "user" u ON c.creator_id = u.id
        LEFT JOIN user__collection uc ON c.id = uc.collection_id AND uc.user_id = p_user_id
        LEFT JOIN collection_access ca ON c.id = ca.collection_id AND ca.user_id = p_user_id
        WHERE c.id = p_collection_id
          AND ((p_user_id IS NULL AND c.is_private = FALSE)
           OR (p_user_id IS NOT NULL AND (c.is_private = FALSE OR c.creator_id = p_user_id OR ca.user_id IS NOT NULL)))
    );
END;
$$;


ALTER FUNCTION public.get_collection_by_id(p_collection_id text, p_user_id text) OWNER TO postgres;

--
-- TOC entry 302 (class 1255 OID 25269)
-- Name: get_collection_clues(text, text, text, text, text, text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_collection_clues(p_collection_id text, p_user_id text DEFAULT NULL::text, p_sort_by text DEFAULT 'Answer'::text, p_sort_direction text DEFAULT 'asc'::text, p_progress_filter text DEFAULT NULL::text, p_status_filter text DEFAULT NULL::text, p_page integer DEFAULT 1) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    result_json jsonb;
    page_size int := 100;
    offset_val int;
BEGIN
    offset_val := (p_page - 1) * page_size;

    WITH clue_data AS (
        SELECT
            c.id,
            c.entry,
            c.lang,
            c.custom_clue,
            c.custom_display_text,
            c.sense_id,
            -- Answer: custom_display_text if exists, otherwise display_text from entry
            COALESCE(c.custom_display_text, e.display_text, '') AS answer,
            -- Sense: summary from sense_translation (entry's lang, or English, or N/A)
            COALESCE(
                (SELECT st.summary
                 FROM sense_translation st
                 WHERE st.sense_id = c.sense_id
                 AND st.lang = c.lang
                 LIMIT 1),
                (SELECT st.summary
                 FROM sense_translation st
                 WHERE st.sense_id = c.sense_id
                 AND st.lang = 'en'
                 LIMIT 1),
                'N/A'
            ) AS sense,
            -- Clue: custom_clue or N/A
            COALESCE(c.custom_clue, 'N/A') AS clue,
            -- Progress status and sorting helpers
            CASE
                WHEN p_user_id IS NULL OR uc.user_id IS NULL THEN 'Unseen'
                WHEN COALESCE(uc.correct_solves, 0) >= COALESCE(uc.correct_solves_needed, 2) THEN 'Completed'
                ELSE 'In Progress'
            END AS progress_status,
            -- Progress display text
            CASE
                WHEN p_user_id IS NULL OR uc.user_id IS NULL THEN 'Unseen'
                WHEN COALESCE(uc.correct_solves, 0) >= COALESCE(uc.correct_solves_needed, 2) THEN 'Completed'
                ELSE COALESCE(uc.correct_solves, 0)::text || '/' || COALESCE(uc.correct_solves_needed, 2)::text
            END AS progress_display,
            -- Progress sort helper: 1 for Completed, 2 for In Progress, 3 for Unseen
            CASE
                WHEN p_user_id IS NULL OR uc.user_id IS NULL THEN 3
                WHEN COALESCE(uc.correct_solves, 0) >= COALESCE(uc.correct_solves_needed, 2) THEN 1
                ELSE 2
            END AS progress_sort_order,
            -- Progress solves needed for sorting In Progress clues
            COALESCE(uc.correct_solves_needed, 2) AS solves_needed,
            -- Status: loading_status from entry or 'Ready'
            COALESCE(e.loading_status, 'Ready') AS status,
            -- Senses: list of all senses for the entry
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'sense_id', s.id,
                        'sense_summary', COALESCE(
                            (SELECT st.summary
                             FROM sense_translation st
                             WHERE st.sense_id = s.id
                             AND st.lang = c.lang
                             LIMIT 1),
                            (SELECT st.summary
                             FROM sense_translation st
                             WHERE st.sense_id = s.id
                             AND st.lang = 'en'
                             LIMIT 1),
                            'N/A'
                        )
                    )
                )
                FROM sense s
                WHERE s.entry = c.entry AND s.lang = c.lang
            ) AS senses
        FROM collection__clue cc
        JOIN clue c ON cc.clue_id = c.id
        LEFT JOIN entry e ON c.entry = e.entry AND c.lang = e.lang
        LEFT JOIN user__clue uc ON c.id = uc.clue_id AND uc.user_id = p_user_id
        WHERE cc.collection_id = p_collection_id
        -- Apply progress filter
        AND (
            p_progress_filter IS NULL OR
            (p_progress_filter = 'Unseen' AND (p_user_id IS NULL OR uc.user_id IS NULL)) OR
            (p_progress_filter = 'Completed' AND p_user_id IS NOT NULL AND uc.user_id IS NOT NULL
             AND COALESCE(uc.correct_solves, 0) >= COALESCE(uc.correct_solves_needed, 2)) OR
            (p_progress_filter = 'In Progress' AND p_user_id IS NOT NULL AND uc.user_id IS NOT NULL
             AND COALESCE(uc.correct_solves, 0) < COALESCE(uc.correct_solves_needed, 2))
        )
        -- Apply status filter
        AND (
            p_status_filter IS NULL OR
            COALESCE(e.loading_status, 'Ready') = p_status_filter
        )
    ),
    sorted_data AS (
        SELECT *
        FROM clue_data
        ORDER BY
            -- When sorting by Answer
            CASE WHEN p_sort_by = 'Answer' AND p_sort_direction = 'asc' THEN answer END ASC,
            CASE WHEN p_sort_by = 'Answer' AND p_sort_direction = 'desc' THEN answer END DESC,
            -- When sorting by Progress, use the special ordering
            CASE WHEN p_sort_by = 'Progress' THEN progress_sort_order END,
            CASE WHEN p_sort_by = 'Progress' AND progress_sort_order = 1 THEN answer END ASC, -- Completed: alphabetical
            CASE WHEN p_sort_by = 'Progress' AND progress_sort_order = 2 THEN solves_needed END DESC, -- In Progress: solves needed desc
            CASE WHEN p_sort_by = 'Progress' AND progress_sort_order = 3 THEN answer END ASC -- Unseen: alphabetical
    ),
    paginated_data AS (
        SELECT *
        FROM sorted_data
        LIMIT page_size
        OFFSET offset_val
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'answer', answer,
            'sense', sense,
            'clue', clue,
            'progress', progress_display,
            'status', status,
            'senses', COALESCE(senses, '[]'::jsonb)
        )
    )
    INTO result_json
    FROM paginated_data;

    RETURN COALESCE(result_json, '[]'::jsonb);
END;
$$;


ALTER FUNCTION public.get_collection_clues(p_collection_id text, p_user_id text, p_sort_by text, p_sort_direction text, p_progress_filter text, p_status_filter text, p_page integer) OWNER TO postgres;

--
-- TOC entry 295 (class 1255 OID 25159)
-- Name: get_crossword_clues(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_crossword_clues(p_collection_id text, p_user_id text DEFAULT NULL::text) RETURNS TABLE(clues_json jsonb)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        jsonb_agg(
            jsonb_build_object(
                'id', c.id,
                'entry', c.entry,
                'lang', c.lang,
                'loading_status', e.loading_status,
                'clue', c.clue,
                'source', c.source,
                'collection_order', cc.order,
                'metadata1', cc.metadata1,
                'metadata2', cc.metadata2,
                'user_progress', CASE
                    WHEN p_user_id IS NOT NULL THEN
                        jsonb_build_object(
                            'total_solves', uc.correct_solves + uc.incorrect_solves,
                            'correct_solves', uc.correct_solves,
                            'incorrect_solves', uc.incorrect_solves,
                            'last_solve', uc.last_solve
                        )
                    ELSE
                        NULL
                END
            )
            ORDER BY cc.order ASC
        ) AS clues_json
    FROM
        collection__clue cc
    JOIN
        clue c ON cc.clue_id = c.id
    LEFT JOIN
        entry e ON c.entry = e.entry AND c.lang = e.lang
    LEFT JOIN
        user__clue uc ON c.id = uc.clue_id AND uc.user_id = p_user_id
    WHERE
        cc.collection_id = p_collection_id;
END;
$$;


ALTER FUNCTION public.get_crossword_clues(p_collection_id text, p_user_id text) OWNER TO postgres;

--
-- TOC entry 277 (class 1255 OID 25157)
-- Name: get_crossword_id(date, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_crossword_id(p_date date, p_publication_id text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_puzzle_id text;
    v_collection_id text;
BEGIN
    -- Find the puzzle ID using the provided date and source link.
    SELECT id
    INTO v_puzzle_id
    FROM puzzle
    WHERE "date" = p_date AND publication_id = p_publication_id;

    -- If a puzzle is found, retrieve the corresponding clue collection ID.
    IF v_puzzle_id IS NOT NULL THEN
        SELECT id
        INTO v_collection_id
        FROM clue_collection
        WHERE puzzle_id = v_puzzle_id;
    END IF;

    -- Return the result as a JSONB object.
    -- If no collection ID is found, the value will be NULL in the JSON output.
    RETURN jsonb_build_object('collection_id', v_collection_id);
END;
$$;


ALTER FUNCTION public.get_crossword_id(p_date date, p_publication_id text) OWNER TO postgres;

--
-- TOC entry 278 (class 1255 OID 25155)
-- Name: get_crosswords_list(date); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_crosswords_list(p_date date) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', cc.id,
      'title', cc.title,
      'author', cc.author,
      'lang', cc.lang,
      'created_date', cc.created_date,
      'metadata1', cc.metadata1,
      'metadata2', cc.metadata2,
      'puzzle_id', p.id,
      'width', p.width,
      'height', p.height,
      'publication_id', pub.id,
      'publication_name', pub.name
    )
  )
  INTO result
  FROM clue_collection cc
  JOIN puzzle p ON cc.puzzle_id = p.id
  JOIN publication pub ON p.publication_id = pub.id
  WHERE DATE(cc.created_date) = p_date;
  
  RETURN result;
END;
$$;


ALTER FUNCTION public.get_crosswords_list(p_date date) OWNER TO postgres;

--
-- TOC entry 280 (class 1255 OID 25162)
-- Name: get_entry(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_entry(p_entry text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN (
        SELECT
            jsonb_build_object(
                'entry', e.entry,
                'lang', e.lang,
                'length', e.length,
                'display_text', e.display_text,
                'entry_type', e.entry_type,
                'familiarity_score', e.familiarity_score,
                'quality_score', e.quality_score,
                'loading_status', e.loading_status,
                'senses', jsonb_agg(
                    jsonb_build_object(
                        'id', es.id,
                        'summary', st.summary,
                        'definition', st.definition,
                        'familiarity_score', es.familiarity_score,
                        'quality_score', es.quality_score,
                        'source_ai', es.source_ai,
                        'example_sentences', (
                            SELECT
                                jsonb_agg(
                                    jsonb_build_object(
                                        'id', exs.id,
                                        'sentence', exs.sentence,
                                        'translated_sentence', exs.translated_sentence,
                                        'source_ai', exs.source_ai
                                    )
                                )
                            FROM
                                example_sentence exs
                            WHERE
                                exs.sense_id = es.id
                        )
                    )
                )
            )
        FROM
            entry e
        LEFT JOIN
            sense es ON e.entry = es.entry AND e.lang = es.lang
        LEFT JOIN
            sense_translation st ON es.id = st.sense_id
        WHERE
            e.entry = p_entry
        GROUP BY
            e.entry, e.lang, e.length, e.display_text, e.entry_type, e.familiarity_score, e.quality_score, e.loading_status
    );
END;
$$;


ALTER FUNCTION public.get_entry(p_entry text) OWNER TO postgres;

--
-- TOC entry 307 (class 1255 OID 25362)
-- Name: get_entry_info_queue_top_10(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_entry_info_queue_top_10() RETURNS TABLE(entry text, display_text text, lang text, existing_sense_ids text[], existing_sense_summaries text[], example_sentence_count integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH top_entries AS (
        SELECT eiq.entry, eiq.lang, eiq.id, e.display_text
        FROM entry_info_queue eiq
        LEFT JOIN entry e ON e.entry = eiq.entry AND e.lang = eiq.lang
        ORDER BY eiq.added_at ASC
        LIMIT 10
    ),
    entry_data AS (
        SELECT
            te.entry,
            te.display_text,
            te.lang,
            COALESCE(array_agg(s.id::text) FILTER (WHERE s.id IS NOT NULL), ARRAY[]::text[]) as existing_sense_ids,
            COALESCE(array_agg(st.summary) FILTER (WHERE st.summary IS NOT NULL), ARRAY[]::text[]) as existing_sense_summaries,
            COALESCE(SUM(es_count.count), 0)::integer as example_sentence_count
        FROM top_entries te
        LEFT JOIN sense s ON s.entry = te.entry AND s.lang = te.lang
        LEFT JOIN sense_translation st ON st.sense_id = s.id AND st.lang = te.lang
        LEFT JOIN (
            SELECT sense_id, COUNT(*) as count
            FROM example_sentence
            GROUP BY sense_id
        ) es_count ON es_count.sense_id = s.id
        GROUP BY te.entry, te.display_text, te.lang
    )
    SELECT ed.entry, ed.display_text, ed.lang, ed.existing_sense_ids, ed.existing_sense_summaries, ed.example_sentence_count
    FROM entry_data ed;

    -- Delete the processed entries from the queue
    DELETE FROM entry_info_queue
    WHERE id IN (
        SELECT id
        FROM entry_info_queue
        ORDER BY added_at ASC
        LIMIT 10
    );
END;
$$;


ALTER FUNCTION public.get_entry_info_queue_top_10() OWNER TO postgres;

--
-- TOC entry 293 (class 1255 OID 25363)
-- Name: get_example_sentence_queue_top_10(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_example_sentence_queue_top_10() RETURNS TABLE(sense_id text, entry text, display_text text, lang text, sense_summary text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        esq.sense_id,
        s.entry,
        e.display_text,
        s.lang,
        st.summary as sense_summary
    FROM example_sentence_queue esq
    JOIN sense s ON s.id = esq.sense_id
    LEFT JOIN entry e ON e.entry = s.entry AND e.lang = s.lang
    LEFT JOIN sense_translation st ON st.sense_id = esq.sense_id AND st.lang = s.lang
    ORDER BY esq.added_at ASC
    LIMIT 10;

    -- Delete the processed entries from the queue
    DELETE FROM example_sentence_queue
    WHERE sense_id IN (
        SELECT sense_id
        FROM example_sentence_queue
        ORDER BY added_at ASC
        LIMIT 10
    );
END;
$$;


ALTER FUNCTION public.get_example_sentence_queue_top_10() OWNER TO postgres;

--
-- TOC entry 284 (class 1255 OID 25341)
-- Name: get_senses_for_entry(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_senses_for_entry(p_entry text, p_lang text) RETURNS TABLE(id text, part_of_speech text, commonness text, summary jsonb, definition jsonb, example_sentences jsonb, translations jsonb, source_ai text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.part_of_speech,
        s.commonness,
        -- Aggregate summaries by language
        jsonb_object_agg(st.lang, st.summary) FILTER (WHERE st.summary IS NOT NULL) as summary,
        -- Aggregate definitions by language
        jsonb_object_agg(st.lang, st.definition) FILTER (WHERE st.definition IS NOT NULL) as definition,
        -- Aggregate example sentences
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', es.id,
                    'sentence', est.sentence,
                    'lang', est.lang
                )
            ) FILTER (WHERE es.id IS NOT NULL),
            '[]'::jsonb
        ) as example_sentences,
        -- Aggregate translations
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'entry', set.entry,
                    'lang', set.lang,
                    'display_text', set.display_text
                )
            ) FILTER (WHERE set.entry IS NOT NULL),
            '[]'::jsonb
        ) as translations,
        s.source_ai
    FROM sense s
    LEFT JOIN sense_translation st ON s.id = st.sense_id
    LEFT JOIN example_sentence es ON s.id = es.sense_id
    LEFT JOIN example_sentence_translation est ON es.id = est.example_id
    LEFT JOIN sense_entry_translation set ON s.id = set.sense_id
    WHERE s.entry = p_entry AND s.lang = p_lang
    GROUP BY s.id, s.part_of_speech, s.commonness, s.source_ai;
END;
$$;


ALTER FUNCTION public.get_senses_for_entry(p_entry text, p_lang text) OWNER TO postgres;

--
-- TOC entry 279 (class 1255 OID 25160)
-- Name: get_single_clue(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_single_clue(p_clue_id text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    clue_record jsonb;
BEGIN
    -- Select the entire row from the clue table where the id matches the input parameter.
    -- Include loading_status from the entry table.
    SELECT to_jsonb(c) || jsonb_build_object('loading_status', e.loading_status)
    INTO clue_record
    FROM clue AS c
    LEFT JOIN entry e ON c.entry = e.entry AND c.lang = e.lang
    WHERE c.id = p_clue_id;

    -- Return the JSONB object containing the clue's data.
    RETURN clue_record;
END;
$$;


ALTER FUNCTION public.get_single_clue(p_clue_id text) OWNER TO postgres;

--
-- TOC entry 285 (class 1255 OID 25343)
-- Name: increment_clue_count_for_collection(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.increment_clue_count_for_collection(p_collection_id text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE clue_collection
    SET clue_count = clue_count + 1
    WHERE id = p_collection_id;
END;
$$;


ALTER FUNCTION public.increment_clue_count_for_collection(p_collection_id text) OWNER TO postgres;

--
-- TOC entry 290 (class 1255 OID 25271)
-- Name: initialize_user_collection_progress(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.initialize_user_collection_progress(p_user_id text, p_collection_id text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO user__collection (user_id, collection_id, unseen, in_progress, completed)
    SELECT
        p_user_id,
        p_collection_id,
        COUNT(*)::int,
        0,
        0
    FROM collection__clue
    WHERE collection_id = p_collection_id
    ON CONFLICT (user_id, collection_id) DO NOTHING;
END;
$$;


ALTER FUNCTION public.initialize_user_collection_progress(p_user_id text, p_collection_id text) OWNER TO postgres;

--
-- TOC entry 305 (class 1255 OID 25360)
-- Name: insert_entries(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.insert_entries(p_entries jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Insert new entries with display_text
    INSERT INTO "entry" ("entry", lang, "length", display_text)
    SELECT
      (e->>'entry')::text,
      (e->>'lang')::text,
      (e->>'length')::integer,
      (e->>'display_text')::text
    FROM jsonb_array_elements(p_entries) AS e
    ON CONFLICT ("entry", lang) DO NOTHING;
END;
$$;


ALTER FUNCTION public.insert_entries(p_entries jsonb) OWNER TO postgres;

--
-- TOC entry 288 (class 1255 OID 25270)
-- Name: insert_user_if_not_exists(text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.insert_user_if_not_exists(p_id text, p_email text, p_first_name text DEFAULT NULL::text, p_last_name text DEFAULT NULL::text, p_native_lang text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO "user" (id, email, first_name, last_name, native_lang, created_at)
    VALUES (p_id, p_email, p_first_name, p_last_name, p_native_lang, NOW())
    ON CONFLICT (id) DO NOTHING;
END;
$$;


ALTER FUNCTION public.insert_user_if_not_exists(p_id text, p_email text, p_first_name text, p_last_name text, p_native_lang text) OWNER TO postgres;

--
-- TOC entry 297 (class 1255 OID 25177)
-- Name: populate_collection_batch(jsonb, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.populate_collection_batch(p_clue_ids jsonb, p_user_id text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
DECLARE
    result_json JSONB;
BEGIN
    -- If no clue IDs provided, return empty array
    IF p_clue_ids IS NULL OR jsonb_array_length(p_clue_ids) = 0 THEN
        RETURN '[]'::jsonb;
    END IF;

    -- Get full clue data for the provided clue IDs with all related data
    WITH clue_data AS (
        SELECT 
            c.id,
            c.entry,
            c.lang,
            c.sense_id,
            c.custom_clue,
            c.custom_display_text,
            c.source,
            s.id as sense_id_full,
            s.part_of_speech,
            s.commonness,
            s.familiarity_score,
            s.quality_score,
            s.source_ai,
            uc.correct_solves,
            uc.incorrect_solves,
            uc.last_solve,
            uc.correct_solves_needed,
            e.display_text,
            e.loading_status,
            -- Get sense translations directly
            COALESCE(
                (SELECT jsonb_agg(DISTINCT
                    jsonb_build_object(
                        'lang', st2.lang,
                        'summary', st2.summary,
                        'definition', st2.definition
                    )
                )
                FROM sense_translation st2 
                WHERE st2.sense_id = s.id),
                '[]'::jsonb
            ) as sense_translations,
            -- Get example sentences directly
            COALESCE(
                (SELECT jsonb_agg(DISTINCT
                    jsonb_build_object(
                        'id', es2.id,
                        'sentence', est2.sentence,
                        'lang', est2.lang
                    )
                )
                FROM example_sentence es2
                LEFT JOIN example_sentence_translation est2 ON es2.id = est2.example_id
                WHERE es2.sense_id = s.id),
                '[]'::jsonb
            ) as example_sentences
        FROM clue c
        LEFT JOIN entry e ON c.entry = e.entry AND c.lang = e.lang
        LEFT JOIN sense s ON c.sense_id = s.id
        LEFT JOIN user__clue uc ON c.id = uc.clue_id AND uc.user_id = p_user_id
        WHERE c.id = ANY(SELECT jsonb_array_elements_text(p_clue_ids)::text)
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', cd.id,
            'entry', cd.entry,
            'lang', cd.lang,
            'display_text', cd.display_text,
            'loading_status', cd.loading_status,
            'sense_id', cd.sense_id,
            'custom_clue', cd.custom_clue,
            'custom_display_text', cd.custom_display_text,
            'source', cd.source,
            'sense', CASE 
                WHEN cd.sense_id IS NOT NULL THEN
                    jsonb_build_object(
                        'id', cd.sense_id_full,
                        'partOfSpeech', cd.part_of_speech,
                        'commonness', cd.commonness,
                        'summary', (
                            SELECT jsonb_object_agg(lang, summary)
                            FROM jsonb_to_recordset(cd.sense_translations) AS t(lang text, summary text)
                            WHERE summary IS NOT NULL
                        ),
                        'definition', (
                            SELECT jsonb_object_agg(lang, definition)
                            FROM jsonb_to_recordset(cd.sense_translations) AS t(lang text, definition text)
                            WHERE definition IS NOT NULL
                        ),
                        'exampleSentences', cd.example_sentences,
                        'familiarityScore', cd.familiarity_score,
                        'qualityScore', cd.quality_score,
                        'sourceAi', cd.source_ai
                    )
                ELSE NULL
            END,
            'progress_data', CASE 
                WHEN p_user_id IS NOT NULL THEN
                    jsonb_build_object(
                        'correct_solves_needed', COALESCE(cd.correct_solves_needed, 0),
                        'correct_solves', COALESCE(cd.correct_solves, 0),
                        'incorrect_solves', COALESCE(cd.incorrect_solves, 0),
                        'last_solve', cd.last_solve
                    )
                ELSE NULL
            END
        )
    )
    INTO result_json
    FROM clue_data cd;

    RETURN COALESCE(result_json, '[]'::jsonb);
END;
$$;


ALTER FUNCTION public.populate_collection_batch(p_clue_ids jsonb, p_user_id text) OWNER TO postgres;

--
-- TOC entry 300 (class 1255 OID 25268)
-- Name: query_entries(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.query_entries(params jsonb) RETURNS TABLE(entry text, lang text, length integer, display_text text, entry_type text, familiarity_score integer, quality_score integer, loading_status text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    _pattern text;
    _query text := params->>'query';
    _lang text := params->>'lang';
    _minFamiliarityScore int := (params->>'minFamiliarityScore')::int;
    _maxFamiliarityScore int := (params->>'maxFamiliarityScore')::int;
    _minQualityScore int := (params->>'minQualityScore')::int;
    _maxQualityScore int := (params->>'maxQualityScore')::int;
    _notInNYT boolean := false;
BEGIN
    -- Check if 'query' is provided and convert it to a valid SQL LIKE pattern
    IF _query IS NOT NULL AND _query != '' THEN
        _pattern := REPLACE(REPLACE(lower(_query), '.', '_'), '*', '%');
    END IF;

    -- Check if the 'NotInNYT' filter is present in the filters array
    IF params->'filters' IS NOT NULL THEN
        -- Check for the 'NotInNYT' string in the filters array
        IF (params->'filters' @> '["NotInNYT"]') THEN
            _notInNYT := true;
        END IF;
    END IF;

    -- Return the result of the query
    RETURN QUERY
    SELECT
        e."entry",
        e.lang,
        e."length",
        e.display_text,
        e.entry_type,
        e.familiarity_score,
        e.quality_score,
        e.loading_status
    FROM
        "entry" e
    WHERE
        -- Match the language if specified
        (_lang IS NULL OR e.lang = _lang) AND
        -- Match the pattern if specified
        (_pattern IS NULL OR lower(e."entry") LIKE _pattern) AND
        -- Match the familiarity score range
        (e.familiarity_score IS NULL OR
         (_minFamiliarityScore IS NULL OR e.familiarity_score >= _minFamiliarityScore) AND
         (_maxFamiliarityScore IS NULL OR e.familiarity_score <= _maxFamiliarityScore)) AND
        -- Match the quality score range
        (e.quality_score IS NULL OR
         (_minQualityScore IS NULL OR e.quality_score >= _minQualityScore) AND
         (_maxQualityScore IS NULL OR e.quality_score <= _maxQualityScore)) AND
        -- Handle the 'NotInNYT' filter
        (NOT _notInNYT OR NOT EXISTS (
            SELECT 1
            FROM entry_tags et
            WHERE et.lang = e.lang AND et."entry" = e."entry" AND et.tag = 'nyt_count'
        ));
END;
$$;


ALTER FUNCTION public.query_entries(params jsonb) OWNER TO postgres;

--
-- TOC entry 260 (class 1255 OID 25077)
-- Name: remove_clue_from_collection(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.remove_clue_from_collection(p_collection_id text, p_clue_id text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    rows_deleted int;
BEGIN
    -- Delete from the junction table and get count of deleted rows
    DELETE FROM collection__clue
    WHERE collection_id = p_collection_id AND clue_id = p_clue_id;

    GET DIAGNOSTICS rows_deleted = ROW_COUNT;

    -- If we actually deleted a row from the junction table, decrement the count
    IF rows_deleted > 0 THEN
        UPDATE clue_collection
        SET clue_count = clue_count - 1
        WHERE id = p_collection_id;
    END IF;

    -- Delete the clue entirely (assuming it's not needed elsewhere)
    -- Note: This will delete the clue even if it might be used in other collections
    DELETE FROM clue
    WHERE id = p_clue_id;
END;
$$;


ALTER FUNCTION public.remove_clue_from_collection(p_collection_id text, p_clue_id text) OWNER TO postgres;

--
-- TOC entry 282 (class 1255 OID 25166)
-- Name: reopen_collection(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reopen_collection(p_user_id text, p_collection_id text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Increment correct_solves_needed by 1 for all completed clues in the collection
    -- A clue is considered completed when correct_solves >= correct_solves_needed
    UPDATE user__clue 
    SET correct_solves_needed = correct_solves_needed + 1
    WHERE user_id = p_user_id 
    AND clue_id IN (
        SELECT cc.clue_id 
        FROM collection__clue cc 
        WHERE cc.collection_id = p_collection_id
    )
    AND correct_solves >= correct_solves_needed;
END;
$$;


ALTER FUNCTION public.reopen_collection(p_user_id text, p_collection_id text) OWNER TO postgres;

--
-- TOC entry 298 (class 1255 OID 25274)
-- Name: select_collection_batch(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.select_collection_batch(p_collection_id text, p_user_id text DEFAULT NULL::text) RETURNS text[]
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_clue_ids TEXT[];
    v_eligible_clues RECORD;
    v_unseen_clues TEXT[];
    v_seen_clues TEXT[];
    v_target_unseen INT := 13;
    v_target_seen INT := 7;
    v_batch_size INT := 20;
BEGIN
    -- Initialize user collection progress if user is provided and progress doesn't exist
    IF p_user_id IS NOT NULL THEN
        PERFORM initialize_user_collection_progress(p_user_id, p_collection_id);
    END IF;

    -- If no user provided, return random batch of 20 clues
    IF p_user_id IS NULL THEN
        SELECT array_agg(clue_id ORDER BY random())
        INTO v_clue_ids
        FROM (
            SELECT cc.clue_id
            FROM collection__clue cc
            JOIN clue c ON cc.clue_id = c.id
            WHERE cc.collection_id = p_collection_id
            AND (c.sense_id IS NOT NULL OR c.custom_clue IS NOT NULL)
            ORDER BY random()
            LIMIT v_batch_size
        ) sub;

        RETURN COALESCE(v_clue_ids, '{}');
    END IF;

    -- Get eligible clues (not completed and not seen in last 24 hours)
    CREATE TEMP TABLE eligible_clues ON COMMIT DROP AS
    SELECT
        cc.clue_id,
        CASE
            WHEN uc.correct_solves >= uc.correct_solves_needed THEN 'completed'
            WHEN uc.last_solve >= CURRENT_DATE - INTERVAL '1 day' THEN 'recent'
            WHEN uc.correct_solves > 0 OR uc.incorrect_solves > 0 THEN 'seen'
            ELSE 'unseen'
        END as status,
        uc.last_solve
    FROM collection__clue cc
    JOIN clue c ON cc.clue_id = c.id
    LEFT JOIN user__clue uc ON cc.clue_id = uc.clue_id AND uc.user_id = p_user_id
    WHERE cc.collection_id = p_collection_id
    AND (c.sense_id IS NOT NULL OR c.custom_clue IS NOT NULL)
    AND (uc.correct_solves IS NULL OR uc.correct_solves < uc.correct_solves_needed)  -- not completed
    AND (uc.last_solve IS NULL OR uc.last_solve < CURRENT_DATE - INTERVAL '1 day'); -- not seen recently

    -- Get unseen clues ordered by earliest last_solve (NULL first, then oldest)
    SELECT array_agg(clue_id)
    INTO v_unseen_clues
    FROM (
        SELECT clue_id
        FROM eligible_clues
        WHERE status = 'unseen'
        ORDER BY last_solve NULLS FIRST, clue_id
    ) t;

    -- Get seen clues ordered by earliest last_solve
    SELECT array_agg(clue_id)
    INTO v_seen_clues
    FROM (
        SELECT clue_id
        FROM eligible_clues
        WHERE status = 'seen'
        ORDER BY last_solve NULLS FIRST, clue_id
    ) t;

    -- If no eligible clues, return random batch of 20 clues from collection
    IF (array_length(v_unseen_clues, 1) IS NULL OR array_length(v_unseen_clues, 1) = 0) AND
       (array_length(v_seen_clues, 1) IS NULL OR array_length(v_seen_clues, 1) = 0) THEN
        SELECT array_agg(clue_id ORDER BY random())
        INTO v_clue_ids
        FROM (
            SELECT cc.clue_id
            FROM collection__clue cc
            JOIN clue c ON cc.clue_id = c.id
            WHERE cc.collection_id = p_collection_id
            AND (c.sense_id IS NOT NULL OR c.custom_clue IS NOT NULL)
            ORDER BY random()
            LIMIT v_batch_size
        ) sub;

        RETURN COALESCE(v_clue_ids, '{}');
    END IF;

    -- Build the batch according to target mix
    v_clue_ids := '{}';

    -- Add unseen clues (up to target, or all available)
    IF array_length(v_unseen_clues, 1) IS NOT NULL AND array_length(v_unseen_clues, 1) > 0 THEN
        v_clue_ids := array_cat(
            v_clue_ids,
            (SELECT array_agg(elem ORDER BY random())
             FROM (
                 SELECT elem
                 FROM unnest(v_unseen_clues) AS elem
                 LIMIT LEAST(v_target_unseen, array_length(v_unseen_clues, 1))
             ) sub)
        );
    END IF;

    -- Add seen clues (up to target, or all available)
    IF array_length(v_seen_clues, 1) IS NOT NULL AND array_length(v_seen_clues, 1) > 0 THEN
        v_clue_ids := array_cat(
            v_clue_ids,
            (SELECT array_agg(elem ORDER BY random())
             FROM (
                 SELECT elem
                 FROM unnest(v_seen_clues) AS elem
                 LIMIT LEAST(v_target_seen, array_length(v_seen_clues, 1))
             ) sub)
        );
    END IF;

    -- If we have fewer than 20 clues, fill remaining with additional unseen or seen clues
    IF array_length(v_clue_ids, 1) < v_batch_size THEN
        -- First try to fill with remaining unseen clues
        IF array_length(v_unseen_clues, 1) IS NOT NULL AND array_length(v_unseen_clues, 1) > v_target_unseen THEN
            v_clue_ids := array_cat(
                v_clue_ids,
                (SELECT array_agg(elem ORDER BY random())
                 FROM (
                     SELECT elem
                     FROM unnest(v_unseen_clues[v_target_unseen + 1:]) AS elem
                     LIMIT v_batch_size - array_length(v_clue_ids, 1)
                 ) sub)
            );
        END IF;

        -- If still need more, fill with remaining seen clues
        IF array_length(v_clue_ids, 1) < v_batch_size AND
           array_length(v_seen_clues, 1) IS NOT NULL AND array_length(v_seen_clues, 1) > v_target_seen THEN
            v_clue_ids := array_cat(
                v_clue_ids,
                (SELECT array_agg(elem ORDER BY random())
                 FROM (
                     SELECT elem
                     FROM unnest(v_seen_clues[v_target_seen + 1:]) AS elem
                     LIMIT v_batch_size - array_length(v_clue_ids, 1)
                 ) sub)
            );
        END IF;
    END IF;

    -- Final randomization of the batch
    SELECT array_agg(elem ORDER BY random())
    INTO v_clue_ids
    FROM unnest(v_clue_ids) AS elem;

    RETURN COALESCE(v_clue_ids, '{}');
END;
$$;


ALTER FUNCTION public.select_collection_batch(p_collection_id text, p_user_id text) OWNER TO postgres;

--
-- TOC entry 301 (class 1255 OID 25165)
-- Name: submit_user_response(text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.submit_user_response(p_user_id text, p_response jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    _clue_id text;
    _collection_id text;
    _is_correct boolean;
    _current_correct_solves integer;
    _current_incorrect_solves integer;
    _current_total_solves integer;
    _correct_solves_needed integer;
    _is_completed boolean;
    _was_completed_before boolean;
    _default_solves_needed integer;
    _is_first_submission boolean;
    _new_correct_solves integer;
    _new_correct_solves_needed integer;
BEGIN
    -- Extract values from the response JSON
    _clue_id := p_response->>'clueId';
    _collection_id := p_response->>'collectionId';
    _is_correct := (p_response->>'isCorrect')::boolean;
    _default_solves_needed := 2;
    
    -- Get current progress data for the user and clue
    SELECT 
        COALESCE(uc.correct_solves, 0),
        COALESCE(uc.incorrect_solves, 0),
        COALESCE(uc.correct_solves, 0) + COALESCE(uc.incorrect_solves, 0),
        COALESCE(uc.correct_solves_needed, _default_solves_needed),
        COALESCE(uc.correct_solves, 0) >= COALESCE(uc.correct_solves_needed, _default_solves_needed)
    INTO 
        _current_correct_solves,
        _current_incorrect_solves,
        _current_total_solves,
        _correct_solves_needed,
        _was_completed_before
    FROM user__clue uc
    WHERE uc.user_id = p_user_id AND uc.clue_id = _clue_id;
    
    -- Check if this is the first submission
    _is_first_submission := NOT FOUND;
    
    -- If no progress record exists, create one with default values
    IF _is_first_submission THEN
        IF _is_correct THEN
            -- Correct response: create with 1 correct solve (one of which is fulfilled)
            INSERT INTO user__clue (user_id, clue_id, correct_solves, incorrect_solves, correct_solves_needed, last_solve)
            VALUES (p_user_id, _clue_id, 1, 0, _default_solves_needed, CURRENT_DATE)
            ON CONFLICT (user_id, clue_id) DO NOTHING;
            
            _current_correct_solves := 0;
            _new_correct_solves := 1;
            _new_correct_solves_needed := _default_solves_needed;
        ELSE
            -- Incorrect response: create with 4 correct solves needed
            INSERT INTO user__clue (user_id, clue_id, correct_solves, incorrect_solves, correct_solves_needed, last_solve)
            VALUES (p_user_id, _clue_id, 0, 1, 4, CURRENT_DATE)
            ON CONFLICT (user_id, clue_id) DO NOTHING;
            
            _current_correct_solves := 0;
            _new_correct_solves := 0;
            _new_correct_solves_needed := 4;
        END IF;
        
        -- Set default values for new record
        _current_incorrect_solves := 0;
        _current_total_solves := 0;
        _correct_solves_needed := _new_correct_solves_needed;
        _was_completed_before := false;
    ELSE
        -- Update the progress based on the response
        IF _is_correct THEN
            -- Correct response: increment correct solves (only if not already completed)
            IF NOT _was_completed_before THEN
                _new_correct_solves := _current_correct_solves + 1;
                _new_correct_solves_needed := _correct_solves_needed;
                
                UPDATE user__clue 
                SET 
                    correct_solves = _new_correct_solves,
                    last_solve = CURRENT_DATE
                WHERE user_id = p_user_id AND clue_id = _clue_id;
            ELSE
                -- Already completed, only update last solve date
                UPDATE user__clue 
                SET last_solve = CURRENT_DATE
                WHERE user_id = p_user_id AND clue_id = _clue_id;
                
                _new_correct_solves := _current_correct_solves;
                _new_correct_solves_needed := _correct_solves_needed;
            END IF;
        ELSE
            -- Incorrect response: increment incorrect solves and add 2 to correct solves needed
            _new_correct_solves_needed := _correct_solves_needed + 2;
            _new_correct_solves := _current_correct_solves;
            
            UPDATE user__clue 
            SET 
                incorrect_solves = _current_incorrect_solves + 1,
                correct_solves_needed = _new_correct_solves_needed,
                last_solve = CURRENT_DATE
            WHERE user_id = p_user_id AND clue_id = _clue_id;
        END IF;
    END IF;
    
    -- Check if clue is now completed after this submission
    _is_completed := _new_correct_solves >= _new_correct_solves_needed;
    
    -- Update user__collection progress as a side effect (if collection_id is provided and record exists)
    IF _collection_id IS NOT NULL THEN
        -- Check if user__collection record exists
        IF EXISTS (SELECT 1 FROM user__collection WHERE user_id = p_user_id AND collection_id = _collection_id) THEN
            -- If this was the first submission, move from unseen to in_progress
            IF _is_first_submission THEN
                UPDATE user__collection
                SET 
                    unseen = GREATEST(0, unseen - 1),
                    in_progress = in_progress + 1
                WHERE user_id = p_user_id AND collection_id = _collection_id;
            END IF;
            
            -- If clue is now completed, move from in_progress to completed
            IF _is_completed AND NOT _was_completed_before THEN
                UPDATE user__collection
                SET 
                    in_progress = GREATEST(0, in_progress - 1),
                    completed = completed + 1
                WHERE user_id = p_user_id AND collection_id = _collection_id;
            END IF;
        END IF;
    END IF;
END;
$$;


ALTER FUNCTION public.submit_user_response(p_user_id text, p_response jsonb) OWNER TO postgres;

--
-- TOC entry 275 (class 1255 OID 25076)
-- Name: upsert_entries(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.upsert_entries(entries_data jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO entry ("entry", root_entry, lang, "length", display_text, entry_type, familiarity_score, quality_score, loading_status)
  SELECT
    elem->>'entry',
    elem->>'root_entry',
    elem->>'lang',
    (elem->>'length')::int,
    elem->>'display_text',
    elem->>'entry_type',
    (elem->>'familiarity_score')::int,
    (elem->>'quality_score')::int,
    elem->>'loading_status'
  FROM jsonb_array_elements(entries_data) AS elem
  ON CONFLICT ("entry", lang) DO UPDATE SET
    root_entry = COALESCE(EXCLUDED.root_entry, entry.root_entry),
    "length" = COALESCE(EXCLUDED."length", entry."length"),
    display_text = COALESCE(EXCLUDED.display_text, entry.display_text),
    entry_type = COALESCE(EXCLUDED.entry_type, entry.entry_type),
    familiarity_score = COALESCE(EXCLUDED.familiarity_score, entry.familiarity_score),
    quality_score = COALESCE(EXCLUDED.quality_score, entry.quality_score),
    loading_status = COALESCE(EXCLUDED.loading_status, entry.loading_status);
END;
$$;


ALTER FUNCTION public.upsert_entries(entries_data jsonb) OWNER TO postgres;

--
-- TOC entry 292 (class 1255 OID 25357)
-- Name: upsert_entry_info(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.upsert_entry_info(p_entry_info jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    sense_record jsonb;
    current_sense_id text;
    entry_name text;
    entry_lang text;
    entry_status text;
BEGIN
    -- Extract parameters from jsonb
    entry_name := (p_entry_info->>'entry')::text;
    entry_lang := (p_entry_info->>'lang')::text;
    entry_status := (p_entry_info->>'status')::text;

    -- Update entry status
    UPDATE "entry"
    SET loading_status = entry_status
    WHERE "entry" = entry_name AND lang = entry_lang;

    -- Process each sense
    FOR sense_record IN SELECT * FROM jsonb_array_elements(p_entry_info->'senses')
    LOOP
        -- Check if sense corresponds to existing sense
        IF sense_record ? 'corresponds_with' AND (sense_record->>'corresponds_with') IS NOT NULL THEN
            -- Find existing sense by summary match
            SELECT s.id INTO current_sense_id
            FROM sense s
            JOIN sense_translation st ON st.sense_id = s.id
            WHERE s.entry = entry_name
              AND s.lang = entry_lang
              AND st.lang = entry_lang
              AND st.summary = (sense_record->>'corresponds_with')
            LIMIT 1;

            IF current_sense_id IS NULL THEN
                -- Generate new sense ID if no match found
                current_sense_id := gen_random_uuid()::text;
            END IF;
        ELSE
            -- Check if sense already has an ID (from the input)
            IF sense_record ? 'id' AND (sense_record->>'id') IS NOT NULL THEN
                current_sense_id := (sense_record->>'id')::text;
            ELSE
                -- Generate new sense ID
                current_sense_id := gen_random_uuid()::text;
            END IF;
        END IF;

        -- Insert or update sense
        INSERT INTO sense (
            id,
            "entry",
            lang,
            part_of_speech,
            commonness,
            source_ai
        ) VALUES (
            current_sense_id,
            entry_name,
            entry_lang,
            (sense_record->>'part_of_speech')::text,
            (sense_record->>'commonness')::text,
            (sense_record->>'source_ai')::text
        )
        ON CONFLICT (id) DO UPDATE SET
            part_of_speech = EXCLUDED.part_of_speech,
            commonness = EXCLUDED.commonness,
            source_ai = EXCLUDED.source_ai;

        -- Insert or update sense translation
        INSERT INTO sense_translation (
            sense_id,
            lang,
            summary,
            "definition"
        ) VALUES (
            current_sense_id,
            entry_lang,
            (sense_record->>'summary')::text,
            (sense_record->>'definition')::text
        )
        ON CONFLICT (sense_id, lang) DO UPDATE SET
            summary = EXCLUDED.summary,
            "definition" = EXCLUDED."definition";
    END LOOP;
END;
$$;


ALTER FUNCTION public.upsert_entry_info(p_entry_info jsonb) OWNER TO postgres;

--
-- TOC entry 276 (class 1255 OID 25079)
-- Name: upsert_sense(text, text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.upsert_sense(p_entry text, p_lang text, sense_data jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_sense_id text := sense_data->>'id';
BEGIN
    INSERT INTO sense (
        id,
        "entry",
        lang,
        part_of_speech,
        commonness,
        source_ai
    ) VALUES (
        v_sense_id,
        p_entry,
        p_lang,
        sense_data->>'part_of_speech',
        sense_data->>'commonness',
        sense_data->>'source_ai'
    )
    ON CONFLICT (id) DO UPDATE SET
        "entry" = EXCLUDED."entry",
        lang = EXCLUDED.lang,
        part_of_speech = EXCLUDED.part_of_speech,
        commonness = EXCLUDED.commonness,
        source_ai = EXCLUDED.source_ai;

    INSERT INTO sense_translation (sense_id, lang, summary, definition)
    SELECT
        v_sense_id AS sense_id,
        summary_lang AS lang,
        summary_text AS summary,
        definition_data.definition_text AS definition
    FROM jsonb_each_text(sense_data->'summary') AS summary_data(summary_lang, summary_text)
    LEFT JOIN LATERAL jsonb_each_text(sense_data->'definition') AS definition_data(definition_lang, definition_text) ON summary_data.summary_lang = definition_data.definition_lang
    ON CONFLICT (sense_id, lang) DO UPDATE SET
        summary = EXCLUDED.summary,
        definition = EXCLUDED.definition;

    INSERT INTO sense_entry_translation (sense_id, "entry", lang, display_text)
    SELECT
        v_sense_id AS sense_id,
        translation_obj->>'entry' AS "entry",
        translation_obj->>'lang' AS lang,
        translation_obj->>'displayText' AS display_text
    FROM (
        SELECT
            key AS lang,
            jsonb_array_elements(value->'naturalTranslations') AS translation_obj
        FROM jsonb_each(sense_data->'translations')
        WHERE jsonb_typeof(value->'naturalTranslations') = 'array'
        
        UNION ALL
        
        SELECT
            key AS lang,
            jsonb_array_elements(value->'colloquialTranslations') AS translation_obj
        FROM jsonb_each(sense_data->'translations')
        WHERE jsonb_typeof(value->'colloquialTranslations') = 'array'
        
        UNION ALL
        
        SELECT
            key AS lang,
            jsonb_array_elements(value->'alternatives') AS translation_obj
        FROM jsonb_each(sense_data->'translations')
        WHERE jsonb_typeof(value->'alternatives') = 'array'
    ) AS translations_data
    ON CONFLICT (sense_id, "entry", lang) DO UPDATE SET
        display_text = EXCLUDED.display_text;

    INSERT INTO example_sentence (id, sense_id)
    SELECT
        ex_sentence->>'id' AS id,
        ex_sentence->>'senseId' AS sense_id
    FROM
        jsonb_array_elements(sense_data->'example_sentences') AS ex_sentence
    ON CONFLICT (id) DO UPDATE SET
        sense_id = EXCLUDED.sense_id;

    INSERT INTO example_sentence_translation (example_id, lang, sentence)
    SELECT
        ex_sentence->>'id' AS example_id,
        lang,
        sentence
    FROM
        jsonb_array_elements(sense_data->'example_sentences') AS ex_sentence,
        jsonb_each_text(ex_sentence->'translations') AS translation_pair(lang, sentence)
    ON CONFLICT (example_id, lang) DO UPDATE SET
        sentence = EXCLUDED.sentence;
END;
$$;


ALTER FUNCTION public.upsert_sense(p_entry text, p_lang text, sense_data jsonb) OWNER TO postgres;

--
-- TOC entry 283 (class 1255 OID 25161)
-- Name: upsert_single_clue(jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.upsert_single_clue(clue_data jsonb) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    clue_id text;
BEGIN
    -- Extract the 'id' from the JSONB input
    clue_id := clue_data ->> 'id';

    -- Perform the UPSERT (INSERT or UPDATE) operation
    INSERT INTO clue (
        id,
        entry,
        lang,
        sense_id,
        custom_clue,
        custom_display_text,
        source
    )
    VALUES (
        clue_id,
        clue_data ->> 'entry',
        clue_data ->> 'lang',
        clue_data ->> 'sense_id',
        clue_data ->> 'custom_clue',
        clue_data ->> 'custom_display_text',
        clue_data ->> 'source'
    )
    ON CONFLICT (id) DO UPDATE SET
        entry = EXCLUDED.entry,
        lang = EXCLUDED.lang,
        sense_id = EXCLUDED.sense_id,
        custom_clue = EXCLUDED.custom_clue,
        custom_display_text = EXCLUDED.custom_display_text,
        source = EXCLUDED.source
    RETURNING id INTO clue_id;

    -- Return the ID of the inserted/updated record
    RETURN clue_id;
END;
$$;


ALTER FUNCTION public.upsert_single_clue(clue_data jsonb) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 224 (class 1259 OID 25005)
-- Name: clue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clue (
    id text NOT NULL,
    entry text NOT NULL,
    lang text NOT NULL,
    sense_id text,
    custom_clue text,
    custom_display_text text,
    source text
);


ALTER TABLE public.clue OWNER TO postgres;

--
-- TOC entry 214 (class 1259 OID 24875)
-- Name: clue_collection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clue_collection (
    id text NOT NULL,
    puzzle_id text,
    title text NOT NULL,
    author text,
    creator_id text,
    description text,
    is_private boolean DEFAULT false NOT NULL,
    created_date timestamp without time zone NOT NULL,
    modified_date timestamp without time zone NOT NULL,
    metadata1 text,
    metadata2 text,
    is_crossword_collection boolean DEFAULT false NOT NULL,
    clue_count integer DEFAULT 0 NOT NULL,
    lang text NOT NULL
);


ALTER TABLE public.clue_collection OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 24947)
-- Name: collection__clue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.collection__clue (
    collection_id text NOT NULL,
    clue_id text NOT NULL,
    "order" integer NOT NULL,
    metadata1 text,
    metadata2 text
);


ALTER TABLE public.collection__clue OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 25167)
-- Name: collection_access; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.collection_access (
    collection_id text NOT NULL,
    user_id text NOT NULL
);


ALTER TABLE public.collection_access OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 25324)
-- Name: custom_clue_translation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_clue_translation (
    clue_id text NOT NULL,
    lang text NOT NULL,
    literal_translation text,
    natural_translation text NOT NULL,
    source_ai text NOT NULL
);


ALTER TABLE public.custom_clue_translation OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 25331)
-- Name: custom_entry_translation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_entry_translation (
    clue_id text NOT NULL,
    entry text NOT NULL,
    lang text NOT NULL,
    display_text text NOT NULL,
    source_ai text NOT NULL
);


ALTER TABLE public.custom_entry_translation OWNER TO postgres;

--
-- TOC entry 215 (class 1259 OID 24884)
-- Name: entry; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entry (
    entry text NOT NULL,
    root_entry text,
    lang text NOT NULL,
    length integer NOT NULL,
    display_text text,
    entry_type text,
    familiarity_score integer,
    quality_score integer,
    loading_status text DEFAULT 'Ready'::text NOT NULL
);


ALTER TABLE public.entry OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 24993)
-- Name: entry_info_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entry_info_queue (
    id integer NOT NULL,
    entry text NOT NULL,
    lang text NOT NULL,
    added_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.entry_info_queue OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 24992)
-- Name: entry_info_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.entry_info_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.entry_info_queue_id_seq OWNER TO postgres;

--
-- TOC entry 3557 (class 0 OID 0)
-- Dependencies: 222
-- Name: entry_info_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.entry_info_queue_id_seq OWNED BY public.entry_info_queue.id;


--
-- TOC entry 217 (class 1259 OID 24898)
-- Name: entry_score; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entry_score (
    entry text NOT NULL,
    lang text NOT NULL,
    familiarity_score integer,
    quality_score integer,
    source_ai text NOT NULL
);


ALTER TABLE public.entry_score OWNER TO postgres;

--
-- TOC entry 216 (class 1259 OID 24891)
-- Name: entry_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entry_tags (
    entry text NOT NULL,
    lang text NOT NULL,
    tag text NOT NULL,
    value text
);


ALTER TABLE public.entry_tags OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 25117)
-- Name: example_sentence; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.example_sentence (
    id text NOT NULL,
    sense_id text NOT NULL
);


ALTER TABLE public.example_sentence OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 25346)
-- Name: example_sentence_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.example_sentence_queue (
    id integer NOT NULL,
    sense_id text NOT NULL,
    added_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.example_sentence_queue OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 25345)
-- Name: example_sentence_queue_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.example_sentence_queue_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.example_sentence_queue_id_seq OWNER TO postgres;

--
-- TOC entry 3558 (class 0 OID 0)
-- Dependencies: 239
-- Name: example_sentence_queue_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.example_sentence_queue_id_seq OWNED BY public.example_sentence_queue.id;


--
-- TOC entry 234 (class 1259 OID 25124)
-- Name: example_sentence_translation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.example_sentence_translation (
    example_id text NOT NULL,
    lang text NOT NULL,
    sentence text NOT NULL
);


ALTER TABLE public.example_sentence_translation OWNER TO postgres;

--
-- TOC entry 213 (class 1259 OID 24868)
-- Name: publication; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.publication (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.publication OWNER TO postgres;

--
-- TOC entry 212 (class 1259 OID 24860)
-- Name: puzzle; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.puzzle (
    id text NOT NULL,
    publication_id text,
    date date NOT NULL,
    lang text DEFAULT 'en'::text NOT NULL,
    author text,
    title text NOT NULL,
    copyright text,
    notes text,
    width integer NOT NULL,
    height integer NOT NULL,
    source_link text
);


ALTER TABLE public.puzzle OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 24905)
-- Name: sense; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sense (
    id text NOT NULL,
    entry text NOT NULL,
    lang text NOT NULL,
    part_of_speech text,
    commonness text,
    familiarity_score integer,
    quality_score integer,
    source_ai text
);


ALTER TABLE public.sense OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 25061)
-- Name: sense_entry_score; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sense_entry_score (
    sense_id text NOT NULL,
    familiarity_score integer,
    quality_score integer,
    source_ai text NOT NULL
);


ALTER TABLE public.sense_entry_score OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 25047)
-- Name: sense_entry_translation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sense_entry_translation (
    sense_id text NOT NULL,
    entry text NOT NULL,
    lang text NOT NULL,
    display_text text NOT NULL
);


ALTER TABLE public.sense_entry_translation OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 25040)
-- Name: sense_translation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sense_translation (
    sense_id text NOT NULL,
    lang text NOT NULL,
    summary text NOT NULL,
    definition text
);


ALTER TABLE public.sense_translation OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 24968)
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    id text NOT NULL,
    email text NOT NULL,
    first_name text,
    last_name text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    native_lang text
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 25131)
-- Name: user__clue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user__clue (
    user_id text NOT NULL,
    clue_id text NOT NULL,
    correct_solves_needed integer NOT NULL,
    correct_solves integer NOT NULL,
    incorrect_solves integer NOT NULL,
    last_solve date
);


ALTER TABLE public.user__clue OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 24978)
-- Name: user__collection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user__collection (
    user_id text NOT NULL,
    collection_id text NOT NULL,
    unseen integer NOT NULL,
    in_progress integer NOT NULL,
    completed integer NOT NULL
);


ALTER TABLE public.user__collection OWNER TO postgres;

--
-- TOC entry 3335 (class 2604 OID 24996)
-- Name: entry_info_queue id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entry_info_queue ALTER COLUMN id SET DEFAULT nextval('public.entry_info_queue_id_seq'::regclass);


--
-- TOC entry 3337 (class 2604 OID 25349)
-- Name: example_sentence_queue id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.example_sentence_queue ALTER COLUMN id SET DEFAULT nextval('public.example_sentence_queue_id_seq'::regclass);


--
-- TOC entry 3537 (class 0 OID 25005)
-- Dependencies: 224
-- Data for Name: clue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clue (id, entry, lang, sense_id, custom_clue, custom_display_text, source) FROM stdin;
clue_001	CHOKOLÁTE	gn	sense_001	\N	\N	Isabel
clue_002	HAYHU	gn	sense_002	\N	\N	Isabel
clue_003	MOÑE'Ẽ	gn	sense_003	\N	\N	Isabel
clue_004	KUATIAÑE'Ẽ	gn	sense_004	\N	\N	Isabel
clue_005	JEROKY	gn	sense_005	\N	\N	Isabel
clue_006	ARETE	gn	sense_006	\N	\N	Isabel
clue_007	KANE'Õ	gn	sense_007	\N	\N	Isabel
county_clue_001	BOISE	en	\N	Ada	Boise	Cruzi
county_clue_002	COUNCIL	en	\N	Adams	Council	Cruzi
county_clue_003	POCATELLO	en	\N	Bannock	Pocatello	Cruzi
county_clue_004	PARIS	en	\N	Bear Lake	Paris	Cruzi
county_clue_005	STMARIES	en	\N	Benewah	St. Maries	Cruzi
county_clue_006	BLACKFOOT	en	\N	Bingham	Blackfoot	Cruzi
county_clue_007	HAILEY	en	\N	Blaine	Hailey	Cruzi
county_clue_008	IDAHOCITY	en	\N	Boise	Idaho City	Cruzi
county_clue_009	SANDPOINT	en	\N	Bonner	Sandpoint	Cruzi
county_clue_010	IDAHOFALLS	en	\N	Bonneville	Idaho Falls	Cruzi
county_clue_011	BONNERSFERRY	en	\N	Boundary	Bonners Ferry	Cruzi
county_clue_012	ARCO	en	\N	Butte	Arco	Cruzi
county_clue_013	FAIRFIELD	en	\N	Camas	Fairfield	Cruzi
county_clue_014	CALDWELL	en	\N	Canyon	Caldwell	Cruzi
county_clue_015	SODASPRINGS	en	\N	Caribou	Soda Springs	Cruzi
county_clue_016	BURLEY	en	\N	Cassia	Burley	Cruzi
county_clue_017	DUBOIS	en	\N	Clark	Dubois	Cruzi
county_clue_018	OROFINO	en	\N	Clearwater	Orofino	Cruzi
county_clue_019	CHALLIS	en	\N	Custer	Challis	Cruzi
county_clue_020	MOUNTAINHOME	en	\N	Elmore	Mountain Home	Cruzi
county_clue_021	PRESTON	en	\N	Franklin	Preston	Cruzi
county_clue_022	SAINTANTHONY	en	\N	Fremont	Saint Anthony	Cruzi
county_clue_023	EMMETT	en	\N	Gem	Emmett	Cruzi
county_clue_024	GOODING	en	\N	Gooding	Gooding	Cruzi
county_clue_025	GRANGEVILLE	en	\N	Idaho	Grangeville	Cruzi
county_clue_026	RIGBY	en	\N	Jefferson	Rigby	Cruzi
county_clue_027	JEROME	en	\N	Jerome	Jerome	Cruzi
county_clue_028	COEURDALENE	en	\N	Kootenai	Coeur d'Alene	Cruzi
county_clue_029	MOSCOW	en	\N	Latah	Moscow	Cruzi
county_clue_030	SALMON	en	\N	Lemhi	Salmon	Cruzi
county_clue_031	NEZPERCE	en	\N	Lewis	Nezperce	Cruzi
county_clue_032	SHOSHONE	en	\N	Lincoln	Shoshone	Cruzi
county_clue_033	REXBURG	en	\N	Madison	Rexburg	Cruzi
county_clue_034	RUPERT	en	\N	Minidoka	Rupert	Cruzi
county_clue_035	LEWISTON	en	\N	Nez Perce	Lewiston	Cruzi
county_clue_036	MALADCITY	en	\N	Oneida	Malad City	Cruzi
county_clue_037	MURPHY	en	\N	Owyhee	Murphy	Cruzi
county_clue_038	PAYETTE	en	\N	Payette	Payette	Cruzi
county_clue_039	AMERICANFALLS	en	\N	Power	American Falls	Cruzi
county_clue_040	WALLACE	en	\N	Shoshone	Wallace	Cruzi
county_clue_041	DRIGGS	en	\N	Teton	Driggs	Cruzi
county_clue_042	TWINFALLS	en	\N	Twin Falls	Twin Falls	Cruzi
county_clue_043	CASCADE	en	\N	Valley	Cascade	Cruzi
county_clue_044	WEISER	en	\N	Washington	Weiser	Cruzi
code_clue_001	ADA	en	\N	1A	Ada	Cruzi
code_clue_002	ADAMS	en	\N	2A	Adams	Cruzi
code_clue_003	BANNOCK	en	\N	1B	Bannock	Cruzi
code_clue_004	BEARLAKE	en	\N	2B	Bear Lake	Cruzi
code_clue_005	BENEWAH	en	\N	3B	Benewah	Cruzi
code_clue_006	BINGHAM	en	\N	4B	Bingham	Cruzi
code_clue_007	BLAINE	en	\N	5B	Blaine	Cruzi
code_clue_008	BOISE	en	\N	6B	Boise	Cruzi
code_clue_009	BONNER	en	\N	7B	Bonner	Cruzi
code_clue_010	BONNEVILLE	en	\N	8B	Bonneville	Cruzi
code_clue_011	BOUNDARY	en	\N	9B	Boundary	Cruzi
code_clue_012	BUTTE	en	\N	10B	Butte	Cruzi
code_clue_013	CAMAS	en	\N	1C	Camas	Cruzi
code_clue_014	CANYON	en	\N	2C	Canyon	Cruzi
code_clue_015	CARIBOU	en	\N	3C	Caribou	Cruzi
code_clue_016	CASSIA	en	\N	4C	Cassia	Cruzi
code_clue_017	CLARK	en	\N	5C	Clark	Cruzi
code_clue_018	CLEARWATER	en	\N	6C	Clearwater	Cruzi
code_clue_019	CUSTER	en	\N	7C	Custer	Cruzi
code_clue_020	ELMORE	en	\N	E	Elmore	Cruzi
code_clue_021	FRANKLIN	en	\N	1F	Franklin	Cruzi
code_clue_022	FREMONT	en	\N	2F	Fremont	Cruzi
code_clue_023	GEM	en	\N	1G	Gem	Cruzi
code_clue_024	GOODING	en	\N	2G	Gooding	Cruzi
code_clue_025	IDAHO	en	\N	I	Idaho	Cruzi
code_clue_026	JEFFERSON	en	\N	1J	Jefferson	Cruzi
code_clue_027	JEROME	en	\N	2J	Jerome	Cruzi
code_clue_028	KOOTENAI	en	\N	K	Kootenai	Cruzi
code_clue_029	LATAH	en	\N	1L	Latah	Cruzi
code_clue_030	LEMHI	en	\N	2L	Lemhi	Cruzi
code_clue_031	LEWIS	en	\N	3L	Lewis	Cruzi
code_clue_032	LINCOLN	en	\N	4L	Lincoln	Cruzi
code_clue_033	MADISON	en	\N	1M	Madison	Cruzi
code_clue_034	MINIDOKA	en	\N	2M	Minidoka	Cruzi
code_clue_035	NEZPERCE	en	\N	N	Nez Perce	Cruzi
code_clue_036	ONEIDA	en	\N	1O	Oneida	Cruzi
code_clue_037	OWYHEE	en	\N	2O	Owyhee	Cruzi
code_clue_038	PAYETTE	en	\N	1P	Payette	Cruzi
code_clue_039	POWER	en	\N	2P	Power	Cruzi
code_clue_040	SHOSHONE	en	\N	S	Shoshone	Cruzi
code_clue_041	TETON	en	\N	1T	Teton	Cruzi
code_clue_042	TWINFALLS	en	\N	2T	Twin Falls	Cruzi
code_clue_043	VALLEY	en	\N	V	Valley	Cruzi
code_clue_044	WASHINGTON	en	\N	W	Washington	Cruzi
h7VO1Z_jxO2	EXTRAVIADO	es	lZvkJII2ppy	\N	\N	\N
X2M7VJUzUhJ	PRESAGIAR	es	RPM15jQ3QFL	\N	\N	user_100196562271398931843
9I278g933mF	BEATORA	es	-GnsmAfCH_c	\N	\N	user_100196562271398931843
i-6FKXeXPju	CORTECELESTIAL	es	Vch3lZJovb3	\N	\N	user_100196562271398931843
\.


--
-- TOC entry 3527 (class 0 OID 24875)
-- Dependencies: 214
-- Data for Name: clue_collection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clue_collection (id, puzzle_id, title, author, creator_id, description, is_private, created_date, modified_date, metadata1, metadata2, is_crossword_collection, clue_count, lang) FROM stdin;
collection_counties	\N	Idaho Counties	Cruzi	user_001	Learn about Idaho counties, their capitals, and codes.	f	2024-01-16 15:00:00	2024-01-16 15:00:00	\N	\N	f	88	en
collection_003	\N	Guaraní Learning	Cruzi	user_001	Palabras básicas en guaraní.	f	2024-01-16 14:30:00	2024-01-16 14:30:00	\N	\N	f	7	gn
collection_casa	\N	La casa de los espíritus	Ben Zoon	100196562271398931843	Spanish vocab from the book	f	2025-11-12 15:00:00	2025-11-12 15:00:00	\N	\N	f	4	es
\.


--
-- TOC entry 3532 (class 0 OID 24947)
-- Dependencies: 219
-- Data for Name: collection__clue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.collection__clue (collection_id, clue_id, "order", metadata1, metadata2) FROM stdin;
collection_003	clue_001	1	\N	\N
collection_003	clue_004	4	\N	\N
collection_003	clue_002	2	\N	\N
collection_003	clue_003	3	\N	\N
collection_003	clue_005	5	\N	\N
collection_003	clue_006	6	\N	\N
collection_003	clue_007	7	\N	\N
collection_counties	county_clue_001	1	\N	\N
collection_counties	county_clue_002	2	\N	\N
collection_counties	county_clue_003	3	\N	\N
collection_counties	county_clue_004	4	\N	\N
collection_counties	county_clue_005	5	\N	\N
collection_counties	county_clue_006	6	\N	\N
collection_counties	county_clue_007	7	\N	\N
collection_counties	county_clue_008	8	\N	\N
collection_counties	county_clue_009	9	\N	\N
collection_counties	county_clue_010	10	\N	\N
collection_counties	county_clue_011	11	\N	\N
collection_counties	county_clue_012	12	\N	\N
collection_counties	county_clue_013	13	\N	\N
collection_counties	county_clue_014	14	\N	\N
collection_counties	county_clue_015	15	\N	\N
collection_counties	county_clue_016	16	\N	\N
collection_counties	county_clue_017	17	\N	\N
collection_counties	county_clue_018	18	\N	\N
collection_counties	county_clue_019	19	\N	\N
collection_counties	county_clue_020	20	\N	\N
collection_counties	county_clue_021	21	\N	\N
collection_counties	county_clue_022	22	\N	\N
collection_counties	county_clue_023	23	\N	\N
collection_counties	county_clue_024	24	\N	\N
collection_counties	county_clue_025	25	\N	\N
collection_counties	county_clue_026	26	\N	\N
collection_counties	county_clue_027	27	\N	\N
collection_counties	county_clue_028	28	\N	\N
collection_counties	county_clue_029	29	\N	\N
collection_counties	county_clue_030	30	\N	\N
collection_counties	county_clue_031	31	\N	\N
collection_counties	county_clue_032	32	\N	\N
collection_counties	county_clue_033	33	\N	\N
collection_counties	county_clue_034	34	\N	\N
collection_counties	county_clue_035	35	\N	\N
collection_counties	county_clue_036	36	\N	\N
collection_counties	county_clue_037	37	\N	\N
collection_counties	county_clue_038	38	\N	\N
collection_counties	county_clue_039	39	\N	\N
collection_counties	county_clue_040	40	\N	\N
collection_counties	county_clue_041	41	\N	\N
collection_counties	county_clue_042	42	\N	\N
collection_counties	county_clue_043	43	\N	\N
collection_counties	county_clue_044	44	\N	\N
collection_counties	code_clue_001	45	\N	\N
collection_counties	code_clue_002	46	\N	\N
collection_counties	code_clue_003	47	\N	\N
collection_counties	code_clue_004	48	\N	\N
collection_counties	code_clue_005	49	\N	\N
collection_counties	code_clue_006	50	\N	\N
collection_counties	code_clue_007	51	\N	\N
collection_counties	code_clue_008	52	\N	\N
collection_counties	code_clue_009	53	\N	\N
collection_counties	code_clue_010	54	\N	\N
collection_counties	code_clue_011	55	\N	\N
collection_counties	code_clue_012	56	\N	\N
collection_counties	code_clue_013	57	\N	\N
collection_counties	code_clue_014	58	\N	\N
collection_counties	code_clue_015	59	\N	\N
collection_counties	code_clue_016	60	\N	\N
collection_counties	code_clue_017	61	\N	\N
collection_counties	code_clue_018	62	\N	\N
collection_counties	code_clue_019	63	\N	\N
collection_counties	code_clue_020	64	\N	\N
collection_counties	code_clue_021	65	\N	\N
collection_counties	code_clue_022	66	\N	\N
collection_counties	code_clue_023	67	\N	\N
collection_counties	code_clue_024	68	\N	\N
collection_counties	code_clue_025	69	\N	\N
collection_counties	code_clue_026	70	\N	\N
collection_counties	code_clue_027	71	\N	\N
collection_counties	code_clue_028	72	\N	\N
collection_counties	code_clue_029	73	\N	\N
collection_counties	code_clue_030	74	\N	\N
collection_counties	code_clue_031	75	\N	\N
collection_counties	code_clue_032	76	\N	\N
collection_counties	code_clue_033	77	\N	\N
collection_counties	code_clue_034	78	\N	\N
collection_counties	code_clue_035	79	\N	\N
collection_counties	code_clue_036	80	\N	\N
collection_counties	code_clue_037	81	\N	\N
collection_counties	code_clue_038	82	\N	\N
collection_counties	code_clue_039	83	\N	\N
collection_counties	code_clue_040	84	\N	\N
collection_counties	code_clue_041	85	\N	\N
collection_counties	code_clue_042	86	\N	\N
collection_counties	code_clue_043	87	\N	\N
collection_counties	code_clue_044	88	\N	\N
collection_casa	h7VO1Z_jxO2	1	\N	\N
collection_casa	X2M7VJUzUhJ	2	\N	\N
collection_casa	9I278g933mF	3	\N	\N
collection_casa	i-6FKXeXPju	4	\N	\N
\.


--
-- TOC entry 3544 (class 0 OID 25167)
-- Dependencies: 236
-- Data for Name: collection_access; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.collection_access (collection_id, user_id) FROM stdin;
\.


--
-- TOC entry 3545 (class 0 OID 25324)
-- Dependencies: 237
-- Data for Name: custom_clue_translation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_clue_translation (clue_id, lang, literal_translation, natural_translation, source_ai) FROM stdin;
\.


--
-- TOC entry 3546 (class 0 OID 25331)
-- Dependencies: 238
-- Data for Name: custom_entry_translation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.custom_entry_translation (clue_id, entry, lang, display_text, source_ai) FROM stdin;
\.


--
-- TOC entry 3528 (class 0 OID 24884)
-- Dependencies: 215
-- Data for Name: entry; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entry (entry, root_entry, lang, length, display_text, entry_type, familiarity_score, quality_score, loading_status) FROM stdin;
CHOKOLÁTE	\N	gn	9	chokoláte	word	30	30	Ready
HAYHU	\N	gn	5	hayhu	word	40	40	Ready
MOÑE'Ẽ	\N	gn	7	moñe'ẽ	word	20	20	Ready
KUATIAÑE'Ẽ	\N	gn	10	kuatiañe'ẽ	word	\N	\N	Ready
JEROKY	\N	gn	6	jeroky	word	\N	\N	Ready
ARETE	\N	gn	5	arete	word	\N	\N	Ready
KANE'Õ	\N	gn	6	kane'õ	word	\N	\N	Ready
ADA	\N	en	3	Ada	word	\N	\N	Ready
ADAMS	\N	en	5	Adams	word	\N	\N	Ready
BANNOCK	\N	en	7	Bannock	word	\N	\N	Ready
BEARLAKE	\N	en	8	Bear Lake	word	\N	\N	Ready
BENEWAH	\N	en	7	Benewah	word	\N	\N	Ready
BINGHAM	\N	en	7	Bingham	word	\N	\N	Ready
BLAINE	\N	en	6	Blaine	word	\N	\N	Ready
BOISE	\N	en	5	Boise	word	\N	\N	Ready
BONNER	\N	en	6	Bonner	word	\N	\N	Ready
BONNEVILLE	\N	en	10	Bonneville	word	\N	\N	Ready
BOUNDARY	\N	en	8	Boundary	word	\N	\N	Ready
BUTTE	\N	en	5	Butte	word	\N	\N	Ready
CAMAS	\N	en	5	Camas	word	\N	\N	Ready
CANYON	\N	en	6	Canyon	word	\N	\N	Ready
CARIBOU	\N	en	7	Caribou	word	\N	\N	Ready
CASSIA	\N	en	6	Cassia	word	\N	\N	Ready
CLARK	\N	en	5	Clark	word	\N	\N	Ready
CLEARWATER	\N	en	10	Clearwater	word	\N	\N	Ready
CUSTER	\N	en	6	Custer	word	\N	\N	Ready
ELMORE	\N	en	6	Elmore	word	\N	\N	Ready
FRANKLIN	\N	en	8	Franklin	word	\N	\N	Ready
FREMONT	\N	en	7	Fremont	word	\N	\N	Ready
GEM	\N	en	3	Gem	word	\N	\N	Ready
GOODING	\N	en	7	Gooding	word	\N	\N	Ready
IDAHO	\N	en	5	Idaho	word	\N	\N	Ready
JEFFERSON	\N	en	9	Jefferson	word	\N	\N	Ready
JEROME	\N	en	6	Jerome	word	\N	\N	Ready
KOOTENAI	\N	en	8	Kootenai	word	\N	\N	Ready
LATAH	\N	en	5	Latah	word	\N	\N	Ready
LEMHI	\N	en	5	Lemhi	word	\N	\N	Ready
LEWIS	\N	en	5	Lewis	word	\N	\N	Ready
LINCOLN	\N	en	7	Lincoln	word	\N	\N	Ready
MADISON	\N	en	7	Madison	word	\N	\N	Ready
MINIDOKA	\N	en	8	Minidoka	word	\N	\N	Ready
NEZPERCE	\N	en	8	Nez Perce	word	\N	\N	Ready
ONEIDA	\N	en	6	Oneida	word	\N	\N	Ready
OWYHEE	\N	en	6	Owyhee	word	\N	\N	Ready
PAYETTE	\N	en	7	Payette	word	\N	\N	Ready
POWER	\N	en	5	Power	word	\N	\N	Ready
SHOSHONE	\N	en	8	Shoshone	word	\N	\N	Ready
TETON	\N	en	5	Teton	word	\N	\N	Ready
TWINFALLS	\N	en	9	Twin Falls	word	\N	\N	Ready
VALLEY	\N	en	6	Valley	word	\N	\N	Ready
WASHINGTON	\N	en	10	Washington	word	\N	\N	Ready
COUNCIL	\N	en	7	Council	word	\N	\N	Ready
POCATELLO	\N	en	9	Pocatello	word	\N	\N	Ready
PARIS	\N	en	5	Paris	word	\N	\N	Ready
STMARIES	\N	en	8	St. Maries	word	\N	\N	Ready
BLACKFOOT	\N	en	9	Blackfoot	word	\N	\N	Ready
HAILEY	\N	en	6	Hailey	word	\N	\N	Ready
IDAHOCITY	\N	en	9	Idaho City	word	\N	\N	Ready
SANDPOINT	\N	en	9	Sandpoint	word	\N	\N	Ready
IDAHOFALLS	\N	en	10	Idaho Falls	word	\N	\N	Ready
BONNERSFERRY	\N	en	12	Bonners Ferry	word	\N	\N	Ready
ARCO	\N	en	4	Arco	word	\N	\N	Ready
FAIRFIELD	\N	en	9	Fairfield	word	\N	\N	Ready
CALDWELL	\N	en	8	Caldwell	word	\N	\N	Ready
SODASPRINGS	\N	en	11	Soda Springs	word	\N	\N	Ready
BURLEY	\N	en	6	Burley	word	\N	\N	Ready
DUBOIS	\N	en	6	Dubois	word	\N	\N	Ready
OROFINO	\N	en	7	Orofino	word	\N	\N	Ready
CHALLIS	\N	en	7	Challis	word	\N	\N	Ready
MOUNTAINHOME	\N	en	12	Mountain Home	word	\N	\N	Ready
PRESTON	\N	en	7	Preston	word	\N	\N	Ready
SAINTANTHONY	\N	en	12	Saint Anthony	word	\N	\N	Ready
EMMETT	\N	en	6	Emmett	word	\N	\N	Ready
GRANGEVILLE	\N	en	11	Grangeville	word	\N	\N	Ready
RIGBY	\N	en	5	Rigby	word	\N	\N	Ready
COEURDALENE	\N	en	12	Coeur d'Alene	word	\N	\N	Ready
MOSCOW	\N	en	6	Moscow	word	\N	\N	Ready
SALMON	\N	en	6	Salmon	word	\N	\N	Ready
REXBURG	\N	en	7	Rexburg	word	\N	\N	Ready
RUPERT	\N	en	6	Rupert	word	\N	\N	Ready
LEWISTON	\N	en	8	Lewiston	word	\N	\N	Ready
MALADCITY	\N	en	9	Malad City	word	\N	\N	Ready
MURPHY	\N	en	6	Murphy	word	\N	\N	Ready
AMERICANFALLS	\N	en	13	American Falls	word	\N	\N	Ready
WALLACE	\N	en	7	Wallace	word	\N	\N	Ready
DRIGGS	\N	en	6	Driggs	word	\N	\N	Ready
CASCADE	\N	en	7	Cascade	word	\N	\N	Ready
WEISER	\N	en	6	Weiser	word	\N	\N	Ready
OVERLYPIOUSWOMAN	\N	en	18	overly pious woman	\N	\N	\N	Ready
SANCTIMONIOUSWOMAN	\N	en	19	sanctimonious woman	\N	\N	\N	Ready
BIGOTEDWOMAN	\N	en	13	bigoted woman	\N	\N	\N	Ready
HOLYROLLER	\N	en	11	holy roller	\N	\N	\N	Ready
RELIGIOUSHYPOCRITE	\N	en	19	religious hypocrite	\N	\N	\N	Ready
GOODYTWOSHOES	\N	en	15	goody-two-shoes	\N	\N	\N	Ready
BEATACONCONNOTACIÓNPEYORATIVA	\N	es	34	beata (con connotación peyorativa)	\N	\N	\N	Ready
SANTURRONA	\N	es	10	santurrona	\N	\N	\N	Ready
MOJIGATA	\N	es	8	mojigata	\N	\N	\N	Ready
BIGOT	\N	en	5	bigot	\N	\N	\N	Ready
CHURCHLADY	\N	en	11	church lady	\N	\N	\N	Ready
BEATA	\N	es	5	beata	\N	\N	\N	Ready
HYPOCRITE	\N	en	9	hypocrite	\N	\N	\N	Ready
EXCESSIVELYPIOUSWOMAN	\N	en	23	excessively pious woman	\N	\N	\N	Ready
MEAPILAS	\N	es	8	meapilas	\N	\N	\N	Ready
BEATORA	\N	es	7	beatora	\N	\N	\N	Ready
HEAVENLYCOURT	\N	en	14	heavenly court	\N	\N	\N	Ready
CELESTIALCOURT	\N	en	15	celestial court	\N	\N	\N	Ready
HEAVENLYHOST	\N	en	13	heavenly host	\N	\N	\N	Ready
CORTEDIVINA	\N	es	12	corte divina	\N	\N	\N	Ready
HUESTECELESTIAL	\N	es	16	hueste celestial	\N	\N	\N	Ready
ASAMBLEACELESTIAL	\N	es	18	asamblea celestial	\N	\N	\N	Ready
CORTECELESTIAL	\N	es	14	corte celestial	\N	\N	\N	Ready
LOST	\N	en	4	lost	\N	\N	\N	Ready
MISPLACED	\N	en	9	misplaced	\N	\N	\N	Ready
GONEMISSING	\N	en	12	gone missing	\N	\N	\N	Ready
MISSING	\N	en	7	missing	\N	\N	\N	Ready
UNLOCATED	\N	es	9	unlocated	\N	\N	\N	Ready
VANISHED	\N	es	8	vanished	\N	\N	\N	Ready
ASTRAY	\N	en	6	astray	\N	\N	\N	Ready
WANDERING	\N	en	9	wandering	\N	\N	\N	Ready
GONEOFFCOURSE	\N	en	15	gone off course	\N	\N	\N	Ready
OFFTRACK	\N	en	9	off track	\N	\N	\N	Ready
DISORIENTED	\N	es	11	disoriented	\N	\N	\N	Ready
OFFCOURSE	\N	es	10	off course	\N	\N	\N	Ready
MISGUIDED	\N	es	9	misguided	\N	\N	\N	Ready
MISGUIDED	\N	en	9	misguided	\N	\N	\N	Ready
ERRANT	\N	en	6	errant	\N	\N	\N	Ready
MORALLYLOST	\N	en	12	morally lost	\N	\N	\N	Ready
GONEBAD	\N	en	8	gone bad	\N	\N	\N	Ready
OFFTHERAILS	\N	en	13	off the rails	\N	\N	\N	Ready
WAYWARD	\N	es	7	wayward	\N	\N	\N	Ready
DEVIANT	\N	es	7	deviant	\N	\N	\N	Ready
ASTRAY	\N	es	6	astray	\N	\N	\N	Ready
EXTRAVIADO	\N	es	10	extraviado	\N	\N	\N	Ready
FORETELL	\N	en	8	foretell	\N	\N	\N	Ready
PORTEND	\N	en	7	portend	\N	\N	\N	Ready
PRESAGE	\N	en	7	presage	\N	\N	\N	Ready
FORESHADOW	\N	en	10	foreshadow	\N	\N	\N	Ready
AUGUR	\N	en	5	augur	\N	\N	\N	Ready
PREDECIR	\N	es	8	predecir	\N	\N	\N	Ready
VATICINAR	\N	es	9	vaticinar	\N	\N	\N	Ready
PRONOSTICAR	\N	es	11	pronosticar	\N	\N	\N	Ready
PRESAGIAR	\N	es	9	presagiar	\N	\N	\N	Ready
XXXYYY	\N	es	6	xxxyyy	\N	\N	\N	Invalid
\.


--
-- TOC entry 3536 (class 0 OID 24993)
-- Dependencies: 223
-- Data for Name: entry_info_queue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entry_info_queue (id, entry, lang, added_at) FROM stdin;
1	EXTRAVIADO	es	2025-11-14 14:07:42.204218
2	PRESAGIAR	es	2025-11-14 14:15:26.021144
3	BEATORA	es	2025-11-14 14:17:14.6252
4	CORTECELESTIAL	es	2025-11-14 14:21:06.814145
5	XXXYYY	es	2025-11-14 14:39:04.016251
\.


--
-- TOC entry 3530 (class 0 OID 24898)
-- Dependencies: 217
-- Data for Name: entry_score; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entry_score (entry, lang, familiarity_score, quality_score, source_ai) FROM stdin;
\.


--
-- TOC entry 3529 (class 0 OID 24891)
-- Dependencies: 216
-- Data for Name: entry_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entry_tags (entry, lang, tag, value) FROM stdin;
\.


--
-- TOC entry 3541 (class 0 OID 25117)
-- Dependencies: 233
-- Data for Name: example_sentence; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.example_sentence (id, sense_id) FROM stdin;
ex_001_001	sense_001
ex_001_002	sense_001
ex_001_003	sense_001
ex_002_001	sense_002
ex_002_002	sense_002
ex_002_003	sense_002
ex_003_001	sense_003
ex_003_002	sense_003
ex_003_003	sense_003
ex_004_001	sense_004
ex_004_002	sense_004
ex_004_003	sense_004
ex_005_001	sense_005
ex_005_002	sense_005
ex_005_003	sense_005
ex_006_001	sense_006
ex_006_002	sense_006
ex_006_003	sense_006
ex_007_001	sense_007
ex_007_002	sense_007
4ee25009-d366-4084-aa42-4712f6aa381f	-GnsmAfCH_c
b6c86a2b-5f70-4fcf-b771-200c529a97f1	-GnsmAfCH_c
7f1c3a6e-9f9b-473c-b2d3-8d0d6477b969	-GnsmAfCH_c
d802a993-f54a-4239-a162-1c2e928029bd	Vch3lZJovb3
f963bb92-283c-43c4-b846-fe71ddde2951	Vch3lZJovb3
6f0146c0-84db-4335-8472-6cad39c8dda3	Vch3lZJovb3
81a46a9b-de2c-4d7e-99fd-810a09383dc7	lZvkJII2ppy
7c4bdf52-2815-4449-b960-6cafcb810ace	lZvkJII2ppy
40909bb4-5bac-41c0-a49d-9a9a9ab45b90	lZvkJII2ppy
b3fc5365-8655-4799-8ccb-2c3c098f87ad	lKnXLPRNT1N
168bcd34-7922-4b59-bf5f-d9f3006509d4	lKnXLPRNT1N
fe4aa3ef-3d51-4363-92df-49dc676bc8c0	lKnXLPRNT1N
4b93f26e-371c-484a-83d2-3fcb5530769f	ERKkH4d90ZP
4e064eea-8fae-4214-95f8-0374835b4a20	ERKkH4d90ZP
38c28826-c48d-4594-987d-9209ae411edb	ERKkH4d90ZP
36ef16f8-86f3-4559-8e9a-d4e17a08734c	RPM15jQ3QFL
a23e0c7f-cb97-4a69-9986-564eae6a34de	RPM15jQ3QFL
3ce11f5b-2f4e-4a06-accc-6f0392f8ca24	RPM15jQ3QFL
\.


--
-- TOC entry 3548 (class 0 OID 25346)
-- Dependencies: 240
-- Data for Name: example_sentence_queue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.example_sentence_queue (id, sense_id, added_at) FROM stdin;
1	-GnsmAfCH_c	2025-12-08 15:22:47.545713
2	Vch3lZJovb3	2025-12-08 15:27:22.504668
3	lZvkJII2ppy	2025-12-08 15:29:21.412424
4	lKnXLPRNT1N	2025-12-08 15:29:21.412424
5	ERKkH4d90ZP	2025-12-08 15:29:21.412424
6	RPM15jQ3QFL	2025-12-08 15:29:28.692483
\.


--
-- TOC entry 3542 (class 0 OID 25124)
-- Dependencies: 234
-- Data for Name: example_sentence_translation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.example_sentence_translation (example_id, lang, sentence) FROM stdin;
ex_001_001	es	Se preparó chocolate con café para el desayuno.
ex_001_001	en	Chocolate with coffee was prepared for breakfast.
ex_001_001	gn	Ojejapo {{chokoláte}} kafe rehe rambosahagua.
ex_001_002	es	El chocolate de gallina se ofrece antes de la ceremonia.
ex_001_002	en	The chicken chocolate is offered before the ceremony.
ex_001_002	gn	{{Chokoláte}} ryguasundie oñeme'ẽ aretepe.
ex_001_003	es	Esa niña prefiere el chocolate con té.
ex_001_003	en	That girl prefers chocolate with tea.
ex_001_003	gn	Pe mitãkuña oiporavo {{chokoláte}} ka'ay rehe.
ex_002_001	es	Amo a mi amigo que va al monte.
ex_002_001	en	I love my friend who goes to the forest.
ex_002_001	gn	Che {{ahayhu}} che irũ ka'aguyre ohóvo.
ex_002_002	es	Ella ama mucho a su hija por las tardes.
ex_002_002	en	She loves her daughter a lot in the afternoons.
ex_002_002	gn	Ha'e {{ohayhu}} heta itajy asajepe.
ex_002_003	es	Nosotros amamos nuestra tierra donde trabajamos.
ex_002_003	en	We love our land where we work.
ex_002_003	gn	Ñande {{jahayhu}} ñande yvy romba'apóvape.
ex_003_001	es	Leí un libro anoche.
ex_003_001	en	I read a book last night.
ex_003_001	gn	Che {{amoñe'ẽ}} peteĩ kuatiañe'ẽ kuehe pyhare.
ex_003_002	es	El maestro lee mucho en guaraní.
ex_003_002	en	The teacher reads a lot in Guaraní.
ex_003_002	gn	Mbo'ehára {{omoñe'ẽ}} heta ñe'ẽ guaraniha.
ex_003_003	es	Los niños leen un libro sobre plantas en la escuela.
ex_003_003	en	The children read a book about plants at school.
ex_003_003	gn	Mitãkuera {{omoñe'ẽ}} kuatia yvyratype mbo'ehaópe.
ex_004_001	es	Mi libro llegó anoche para leer.
ex_004_001	en	My book arrived last night for reading.
ex_004_001	gn	Che {{kuatiañe'ẽ}} oguahẽ kuehe pyhare oñemoñe'ẽravo.
ex_004_002	es	Un libro nuevo se encuentra en la biblioteca de la escuela.
ex_004_002	en	A new book is found in the school library.
ex_004_002	gn	{{Kuatiañe'ẽ}} pyahu ojejuhu mbo'ehaope.
ex_004_003	es	Puso el libro sobre la mesa para leer.
ex_004_003	en	She put the book on the table to read.
ex_004_003	gn	Oñemoĩ {{kuatiañe'ẽ}} mesa ári oñemoñe'ẽvo.
ex_005_001	es	Nosotros bailamos en una gran fiesta.
ex_005_001	en	We danced at a big party.
ex_005_001	gn	Ñande {{jajeroky}} peteĩ arete guasúpe.
ex_005_002	es	La niña baila chamamé con alegría.
ex_005_002	en	The girl dances chamamé with joy.
ex_005_002	gn	Mitãkuña {{ojeroky}} chamamé vyape.
ex_005_003	es	Él bailó polka anoche en el bosque.
ex_005_003	en	He danced polka last night in the forest.
ex_005_003	gn	Ha'e {{ojeroky}} polka pyharekue ka'aguýpe.
ex_006_001	es	La fiesta se realiza esta tarde.
ex_006_001	en	The party is happening this afternoon.
ex_006_001	gn	Pe {{arete}} oikota ka'aruete.
ex_006_002	es	Nuestra fiesta se organiza en el monte.
ex_006_002	en	Our party is organized in the forest.
ex_006_002	gn	Ñande {{arete}} ojejapota ka'aguype.
ex_006_003	es	Una gran fiesta tuvo lugar en mi casa anoche.
ex_006_003	en	A big party took place at my house last night.
ex_006_003	gn	{{Arete}} guasu oikokuri che rogape kuehepyhare.
ex_007_001	es	Estoy cansado después de caminar en el bosque.
ex_007_001	en	I'm tired after walking in the forest.
ex_007_001	gn	Che {{chekane'õ}} aguata rire ka'aguýpe.
ex_007_002	es	Ella está muy cansada después de cocinar.
ex_007_002	en	She is very tired after cooking.
ex_007_002	gn	Ha'e {{ikane'õ}} heta ojapo cenagua rire.
4ee25009-d366-4084-aa42-4712f6aa381f	en	My aunt acts like an overly pious woman every time she visits the church.
4ee25009-d366-4084-aa42-4712f6aa381f	es	Mi tía se comporta como una beatora cada vez que visita la iglesia.
b6c86a2b-5f70-4fcf-b771-200c529a97f1	en	At the neighborhood meeting, Mrs. Lopez was the excessively devout one, always quoting verses.
b6c86a2b-5f70-4fcf-b771-200c529a97f1	es	En la reunión de vecinos, la señora López era la beatora del grupo, siempre citando versículos.
7f1c3a6e-9f9b-473c-b2d3-8d0d6477b969	en	Don't be so primly pious; a little fun doesn't hurt anyone.
7f1c3a6e-9f9b-473c-b2d3-8d0d6477b969	es	No seas tan beatora, un poquito de diversión no le hace daño a nadie.
d802a993-f54a-4239-a162-1c2e928029bd	en	With such a good cake, it seems like the heavenly court made it!
d802a993-f54a-4239-a162-1c2e928029bd	es	Con este pastel tan bueno, ¡parece que lo hizo la corte celestial!
f963bb92-283c-43c4-b846-fe71ddde2951	en	Grandma used to say her garden was so beautiful it looked like a small heavenly court.
f963bb92-283c-43c4-b846-fe71ddde2951	es	La abuela decía que su jardín era tan hermoso que parecía una pequeña corte celestial.
6f0146c0-84db-4335-8472-6cad39c8dda3	en	May the heavenly court watch over us on this journey.
6f0146c0-84db-4335-8472-6cad39c8dda3	es	Que la corte celestial nos cuide en este viaje.
81a46a9b-de2c-4d7e-99fd-810a09383dc7	en	My wallet is missing; I can't find it anywhere.
81a46a9b-de2c-4d7e-99fd-810a09383dc7	es	Mi cartera está extraviada, no la encuentro por ningún lado.
7c4bdf52-2815-4449-b960-6cafcb810ace	en	The order package shows as lost in the system.
7c4bdf52-2815-4449-b960-6cafcb810ace	es	El paquete del pedido aparece como extraviado en el sistema.
40909bb4-5bac-41c0-a49d-9a9a9ab45b90	en	We put up posters because our cat has been missing for two days.
40909bb4-5bac-41c0-a49d-9a9a9ab45b90	es	Pusimos carteles porque nuestro gato lleva dos días extraviado.
b3fc5365-8655-4799-8ccb-2c3c098f87ad	en	I think we're lost; this road doesn't look familiar at all.
b3fc5365-8655-4799-8ccb-2c3c098f87ad	es	Creo que estamos extraviados; este camino no me suena de nada.
168bcd34-7922-4b59-bf5f-d9f3006509d4	en	The child felt lost in the mall after getting separated from his parents.
168bcd34-7922-4b59-bf5f-d9f3006509d4	es	El niño se sintió extraviado en el centro comercial al separarse de sus padres.
fe4aa3ef-3d51-4363-92df-49dc676bc8c0	en	After that fork, we got a bit lost in the woods.
fe4aa3ef-3d51-4363-92df-49dc676bc8c0	es	Después de esa bifurcación, nos quedamos un poco extraviados por el bosque.
4b93f26e-371c-484a-83d2-3fcb5530769f	en	His political ideas seem a bit misguided to most people.
4b93f26e-371c-484a-83d2-3fcb5530769f	es	Sus ideas políticas parecen un poco extraviadas para la mayoría.
4e064eea-8fae-4214-95f8-0374835b4a20	en	After the breakup, his behavior became a bit astray.
4e064eea-8fae-4214-95f8-0374835b4a20	es	Después de la ruptura, su comportamiento se volvió un poco extraviado.
38c28826-c48d-4594-987d-9209ae411edb	en	The mentor tried to guide him so he wouldn't feel lost in life.
38c28826-c48d-4594-987d-9209ae411edb	es	El mentor intentó guiarlo para que no se sintiera extraviado en la vida.
36ef16f8-86f3-4559-8e9a-d4e17a08734c	en	The unusual silence from the kids often presages some mischief.
a23e0c7f-cb97-4a69-9986-564eae6a34de	en	That extra meeting at the last minute usually doesn't presage anything good.
3ce11f5b-2f4e-4a06-accc-6f0392f8ca24	en	Juan's sudden nervous laugh presaged that there was a surprise.
36ef16f8-86f3-4559-8e9a-d4e17a08734c	es	El inusual silencio de los niños suele {{presagiar}} alguna travesura.
a23e0c7f-cb97-4a69-9986-564eae6a34de	es	Esa reunión extra a última hora no suele {{presagiar}} nada bueno.
3ce11f5b-2f4e-4a06-accc-6f0392f8ca24	es	La repentina risa nerviosa de Juan {{presagiaba}} que había una sorpresa.
\.


--
-- TOC entry 3526 (class 0 OID 24868)
-- Dependencies: 213
-- Data for Name: publication; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.publication (id, name) FROM stdin;
\.


--
-- TOC entry 3525 (class 0 OID 24860)
-- Dependencies: 212
-- Data for Name: puzzle; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.puzzle (id, publication_id, date, lang, author, title, copyright, notes, width, height, source_link) FROM stdin;
\.


--
-- TOC entry 3531 (class 0 OID 24905)
-- Dependencies: 218
-- Data for Name: sense; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sense (id, entry, lang, part_of_speech, commonness, familiarity_score, quality_score, source_ai) FROM stdin;
sense_001	CHOKOLÁTE	gn	noun	primary	\N	\N	common_words
sense_002	HAYHU	gn	verb	primary	\N	\N	common_words
sense_003	MOÑE'Ẽ	gn	verb	primary	\N	\N	common_words
sense_004	KUATIAÑE'Ẽ	gn	noun	primary	\N	\N	common_words
sense_005	JEROKY	gn	verb	primary	\N	\N	common_words
sense_006	ARETE	gn	noun	primary	\N	\N	common_words
sense_007	KANE'Õ	gn	adjective	primary	\N	\N	common_words
609e712c-4125-4a3d-a2ff-8aa7832ef0a6	BEATORA	es	Noun	Primary	\N	\N	gemini
-GnsmAfCH_c	BEATORA	es	Sustantivo	Primary	\N	\N	gemini
Vch3lZJovb3	CORTECELESTIAL	es	Noun	Primary	\N	\N	gemini
lZvkJII2ppy	EXTRAVIADO	es	Adjetivo	Primario	\N	\N	gemini
lKnXLPRNT1N	EXTRAVIADO	es	Adjetivo	Común	\N	\N	gemini
ERKkH4d90ZP	EXTRAVIADO	es	Adjetivo	Poco común	\N	\N	gemini
RPM15jQ3QFL	PRESAGIAR	es	Verbo	Primary	\N	\N	gemini
\.


--
-- TOC entry 3540 (class 0 OID 25061)
-- Dependencies: 227
-- Data for Name: sense_entry_score; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sense_entry_score (sense_id, familiarity_score, quality_score, source_ai) FROM stdin;
\.


--
-- TOC entry 3539 (class 0 OID 25047)
-- Dependencies: 226
-- Data for Name: sense_entry_translation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sense_entry_translation (sense_id, entry, lang, display_text) FROM stdin;
sense_001	chokora	gn	chokora
sense_001	kakau	gn	kakau
sense_002	amar	es	amar
sense_002	querer	es	querer
sense_002	love	en	love
sense_002	care for	en	care for
sense_003	leer	es	leer
sense_003	lectura	es	lectura
sense_003	read	en	read
sense_003	reading	en	reading
sense_004	libro	es	libro
sense_004	texto	es	texto
sense_004	book	en	book
sense_004	volume	en	volume
sense_005	bailar	es	bailar
sense_005	danza	es	danza
sense_005	dance	en	dance
sense_005	dancing	en	dancing
sense_006	fiesta	es	fiesta
sense_006	celebración	es	celebración
sense_006	party	en	party
sense_006	celebration	en	celebration
sense_007	cansado	es	cansado
sense_007	fatigado	es	fatigado
sense_007	tired	en	tired
sense_007	weary	en	weary
-GnsmAfCH_c	SANCTIMONIOUSWOMAN	en	sanctimonious woman
-GnsmAfCH_c	BIGOT	en	bigot
-GnsmAfCH_c	EXCESSIVELYPIOUSWOMAN	en	excessively pious woman
-GnsmAfCH_c	HOLYROLLER	en	holy roller
-GnsmAfCH_c	CHURCHLADY	en	church lady
-GnsmAfCH_c	MOJIGATA	es	mojigata
-GnsmAfCH_c	MEAPILAS	es	meapilas
-GnsmAfCH_c	SANTURRONA	es	santurrona
Vch3lZJovb3	HEAVENLYCOURT	en	heavenly court
Vch3lZJovb3	CELESTIALCOURT	en	celestial court
Vch3lZJovb3	HEAVENLYHOST	en	heavenly host
Vch3lZJovb3	CORTEDIVINA	es	corte divina
Vch3lZJovb3	HUESTECELESTIAL	es	hueste celestial
Vch3lZJovb3	ASAMBLEACELESTIAL	es	asamblea celestial
lZvkJII2ppy	LOST	en	lost
lZvkJII2ppy	MISPLACED	en	misplaced
lZvkJII2ppy	GONEMISSING	en	gone missing
lZvkJII2ppy	MISSING	en	missing
lZvkJII2ppy	UNLOCATED	es	unlocated
lZvkJII2ppy	VANISHED	es	vanished
lKnXLPRNT1N	ASTRAY	en	astray
lKnXLPRNT1N	WANDERING	en	wandering
lKnXLPRNT1N	LOST	en	lost
lKnXLPRNT1N	GONEOFFCOURSE	en	gone off course
lKnXLPRNT1N	OFFTRACK	en	off track
lKnXLPRNT1N	DISORIENTED	es	disoriented
lKnXLPRNT1N	OFFCOURSE	es	off course
lKnXLPRNT1N	MISGUIDED	es	misguided
ERKkH4d90ZP	MISGUIDED	en	misguided
ERKkH4d90ZP	ERRANT	en	errant
ERKkH4d90ZP	MORALLYLOST	en	morally lost
ERKkH4d90ZP	GONEBAD	en	gone bad
ERKkH4d90ZP	OFFTHERAILS	en	off the rails
ERKkH4d90ZP	WAYWARD	es	wayward
ERKkH4d90ZP	DEVIANT	es	deviant
ERKkH4d90ZP	ASTRAY	es	astray
RPM15jQ3QFL	FORETELL	en	foretell
RPM15jQ3QFL	PORTEND	en	portend
RPM15jQ3QFL	PRESAGE	en	presage
RPM15jQ3QFL	FORESHADOW	en	foreshadow
RPM15jQ3QFL	AUGUR	en	augur
RPM15jQ3QFL	PREDECIR	es	predecir
RPM15jQ3QFL	VATICINAR	es	vaticinar
RPM15jQ3QFL	PRONOSTICAR	es	pronosticar
\.


--
-- TOC entry 3538 (class 0 OID 25040)
-- Dependencies: 225
-- Data for Name: sense_translation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sense_translation (sense_id, lang, summary, definition) FROM stdin;
sense_001	es	pasta de cacao y azúcar	Pasta hecha con cacao y azúcar molidos, a la que generalmente se añade canela o vainilla.
sense_001	en	cocoa and sugar paste	Paste made from ground cocoa and sugar, to which cinnamon or vanilla is usually added.
sense_002	es	amar, querer	Expresar amor o cariño hacia una persona, lugar o cosa.
sense_002	en	to love, to care for	To express love or affection towards a person, place, or thing.
sense_003	es	leer	Interpretar o pronunciar en voz alta un texto escrito.
sense_003	en	to read	To interpret or read aloud written text.
sense_004	es	libro	Conjunto de hojas impresas o escritas, encuadernadas, que contienen texto o información.
sense_004	en	book	A set of printed or written pages, bound together, containing text or information.
sense_005	es	bailar	Mover el cuerpo al ritmo de la música, generalmente en un evento social o festivo.
sense_005	en	to dance	To move the body to the rhythm of music, usually at a social or festive event.
sense_006	es	fiesta	Celebración o evento social donde las personas se reúnen para disfrutar, bailar o compartir.
sense_006	en	party	A celebration or social event where people gather to enjoy, dance, or share.
sense_007	es	cansado	Estado de fatiga o agotamiento físico o mental después de una actividad.
sense_007	en	tired	A state of physical or mental fatigue after an activity.
609e712c-4125-4a3d-a2ff-8aa7832ef0a6	es	Mujer con piedad fingida o excesiva	Se refiere a una mujer cuya devoción religiosa es considerada exagerada, ostentosa o, incluso, hipócrita, utilizada a menudo con un matiz despectivo.
-GnsmAfCH_c	es	Mujer de piedad exagerada u ostentosa	Una mujer que muestra una devoción religiosa excesiva o teatral, a menudo percibida como hipócrita, mojigata o excesivamente escrupulosa en sus prácticas externas, más que por una fe interior genuina. Frecuentemente conlleva una connotación negativa, sugiriendo superficialidad, chismorreo o actitud sentenciosa.
Vch3lZJovb3	es	Asamblea divina en el cielo	Se refiere al conjunto de ángeles, santos y otras figuras divinas que, según la tradición religiosa (especialmente la cristiana), habitan en el cielo y sirven a Dios, formando su séquito o cortejo.
lZvkJII2ppy	es	Que no se encuentra; perdido	Se refiere a un objeto o una persona que se ha perdido, extraviado o ha sido desubicado y no puede ser localizado.
lKnXLPRNT1N	es	Que ha perdido el camino	Describe a una persona o animal que ha perdido su orientación o la dirección correcta, habiéndose desviado de su curso.
ERKkH4d90ZP	es	Moral o mentalmente desviado	Se aplica a una persona que se ha apartado de los principios morales, el buen juicio o la claridad intelectual; descarriado o moralmente confuso.
RPM15jQ3QFL	es	Anunciar o indicar algo futuro	Indicar, anunciar o prever por conjeturas o por ciertas señales o indicios, algo que ha de suceder. A menudo se usa en contextos donde lo que se anuncia es negativo o de gran relevancia.
\.


--
-- TOC entry 3533 (class 0 OID 24968)
-- Dependencies: 220
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."user" (id, email, first_name, last_name, created_at, native_lang) FROM stdin;
user_001	cruzi@gmail.com	Cruzi	\N	2024-01-01 10:00:00	en
user_002	ben_zoon@gmail.com	Ben	Zoon	2024-01-02 10:00:00	es
100196562271398931843	ben4808@gmail.com	Ben	Zoon	2025-11-04 15:47:30.767485	en
\.


--
-- TOC entry 3543 (class 0 OID 25131)
-- Dependencies: 235
-- Data for Name: user__clue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user__clue (user_id, clue_id, correct_solves_needed, correct_solves, incorrect_solves, last_solve) FROM stdin;
100196562271398931843	clue_005	4	2	1	2025-11-11
100196562271398931843	clue_001	6	3	2	2025-11-11
100196562271398931843	clue_002	4	2	1	2025-11-11
100196562271398931843	clue_006	6	4	2	2025-11-11
100196562271398931843	clue_003	4	2	1	2025-11-11
100196562271398931843	clue_007	8	2	3	2025-11-11
100196562271398931843	clue_004	8	2	3	2025-11-11
\.


--
-- TOC entry 3534 (class 0 OID 24978)
-- Dependencies: 221
-- Data for Name: user__collection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user__collection (user_id, collection_id, unseen, in_progress, completed) FROM stdin;
100196562271398931843	collection_003	0	4	3
\.


--
-- TOC entry 3559 (class 0 OID 0)
-- Dependencies: 222
-- Name: entry_info_queue_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.entry_info_queue_id_seq', 5, true);


--
-- TOC entry 3560 (class 0 OID 0)
-- Dependencies: 239
-- Name: example_sentence_queue_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.example_sentence_queue_id_seq', 6, true);


--
-- TOC entry 3344 (class 2606 OID 24882)
-- Name: clue_collection clue_collection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clue_collection
    ADD CONSTRAINT clue_collection_pkey PRIMARY KEY (id);


--
-- TOC entry 3365 (class 2606 OID 25011)
-- Name: clue clue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clue
    ADD CONSTRAINT clue_pkey PRIMARY KEY (id);


--
-- TOC entry 3355 (class 2606 OID 24953)
-- Name: collection__clue collection__clue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collection__clue
    ADD CONSTRAINT collection__clue_pkey PRIMARY KEY (collection_id, clue_id);


--
-- TOC entry 3379 (class 2606 OID 25173)
-- Name: collection_access collection_access_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.collection_access
    ADD CONSTRAINT collection_access_pkey PRIMARY KEY (collection_id, user_id);


--
-- TOC entry 3381 (class 2606 OID 25330)
-- Name: custom_clue_translation custom_clue_translation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_clue_translation
    ADD CONSTRAINT custom_clue_translation_pkey PRIMARY KEY (clue_id, lang);


--
-- TOC entry 3383 (class 2606 OID 25337)
-- Name: custom_entry_translation custom_entry_translation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_entry_translation
    ADD CONSTRAINT custom_entry_translation_pkey PRIMARY KEY (clue_id, entry, lang);


--
-- TOC entry 3363 (class 2606 OID 25001)
-- Name: entry_info_queue entry_info_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entry_info_queue
    ADD CONSTRAINT entry_info_queue_pkey PRIMARY KEY (id);


--
-- TOC entry 3347 (class 2606 OID 24890)
-- Name: entry entry_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entry
    ADD CONSTRAINT entry_pkey PRIMARY KEY (entry, lang);


--
-- TOC entry 3351 (class 2606 OID 24904)
-- Name: entry_score entry_score_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entry_score
    ADD CONSTRAINT entry_score_pkey PRIMARY KEY (entry, lang, source_ai);


--
-- TOC entry 3349 (class 2606 OID 24897)
-- Name: entry_tags entry_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entry_tags
    ADD CONSTRAINT entry_tags_pkey PRIMARY KEY (entry, lang, tag);


--
-- TOC entry 3373 (class 2606 OID 25123)
-- Name: example_sentence example_sentence_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.example_sentence
    ADD CONSTRAINT example_sentence_pkey PRIMARY KEY (id);


--
-- TOC entry 3385 (class 2606 OID 25354)
-- Name: example_sentence_queue example_sentence_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.example_sentence_queue
    ADD CONSTRAINT example_sentence_queue_pkey PRIMARY KEY (id);


--
-- TOC entry 3375 (class 2606 OID 25130)
-- Name: example_sentence_translation example_sentence_translation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.example_sentence_translation
    ADD CONSTRAINT example_sentence_translation_pkey PRIMARY KEY (example_id, lang);


--
-- TOC entry 3342 (class 2606 OID 24874)
-- Name: publication publication_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.publication
    ADD CONSTRAINT publication_pkey PRIMARY KEY (id);


--
-- TOC entry 3340 (class 2606 OID 24867)
-- Name: puzzle puzzle_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.puzzle
    ADD CONSTRAINT puzzle_pkey PRIMARY KEY (id);


--
-- TOC entry 3371 (class 2606 OID 25067)
-- Name: sense_entry_score sense_entry_score_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sense_entry_score
    ADD CONSTRAINT sense_entry_score_pkey PRIMARY KEY (sense_id, source_ai);


--
-- TOC entry 3369 (class 2606 OID 25053)
-- Name: sense_entry_translation sense_entry_translation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sense_entry_translation
    ADD CONSTRAINT sense_entry_translation_pkey PRIMARY KEY (sense_id, entry, lang);


--
-- TOC entry 3353 (class 2606 OID 24911)
-- Name: sense sense_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sense
    ADD CONSTRAINT sense_pkey PRIMARY KEY (id);


--
-- TOC entry 3367 (class 2606 OID 25046)
-- Name: sense_translation sense_translation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sense_translation
    ADD CONSTRAINT sense_translation_pkey PRIMARY KEY (sense_id, lang);


--
-- TOC entry 3377 (class 2606 OID 25137)
-- Name: user__clue user__clue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user__clue
    ADD CONSTRAINT user__clue_pkey PRIMARY KEY (user_id, clue_id);


--
-- TOC entry 3361 (class 2606 OID 24984)
-- Name: user__collection user__collection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user__collection
    ADD CONSTRAINT user__collection_pkey PRIMARY KEY (user_id, collection_id);


--
-- TOC entry 3357 (class 2606 OID 24977)
-- Name: user user_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_key UNIQUE (email);


--
-- TOC entry 3359 (class 2606 OID 24975)
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- TOC entry 3345 (class 1259 OID 24883)
-- Name: ix_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_date ON public.clue_collection USING btree (created_date);


--
-- TOC entry 3555 (class 0 OID 0)
-- Dependencies: 6
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


-- Completed on 2026-01-01 23:27:40

--
-- PostgreSQL database dump complete
--

\unrestrict kxYUqGVdsnTb9VOVTUuFzIbVZxWXoymWghK3ca72GRiUFXoYHXS65q5QubrFy4c

