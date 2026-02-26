--
-- PostgreSQL database dump
--

\restrict Pr69QBMXTbbkm7ILGIsT2JFlSe2CaT16Lfe3yQCJETLYeiF0skukNajGkPN1SP6

-- Dumped from database version 17.8 (6108b59)
-- Dumped by pg_dump version 17.9

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
-- Name: generate_no_nota(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_no_nota(p_year integer) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_counter INTEGER;
  v_no_nota TEXT;
BEGIN
  INSERT INTO public.nota_counter (year, counter) VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE SET counter = nota_counter.counter + 1
  RETURNING counter INTO v_counter;

  v_no_nota := LPAD(v_counter::TEXT, 3, '0') || '/KDNINV/' || p_year::TEXT;
  RETURN v_no_nota;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: nota_counter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nota_counter (
    year integer NOT NULL,
    counter integer DEFAULT 0
);


--
-- Name: pengajuan; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pengajuan (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    no_nota text NOT NULL,
    tanggal date NOT NULL,
    divisi text,
    rekening_sumber text,
    bank_sumber text,
    nama_sumber text,
    rekening_penerima text,
    bank_penerima text,
    nama_penerima text,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    grand_total numeric(15,2) DEFAULT 0 NOT NULL,
    grand_total_terbilang text,
    file_url text,
    file_public_id text,
    file_name text,
    status text DEFAULT 'pending'::text NOT NULL,
    submitted_by integer NOT NULL,
    submitted_by_username text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now(),
    signature_user text,
    signature_manager text,
    signature_admin_finish text,
    approved_at timestamp with time zone,
    approved_by integer,
    approved_by_username text,
    rejected_at timestamp with time zone,
    rejected_by integer,
    rejected_by_username text,
    rejection_reason text,
    finished_at timestamp with time zone,
    finished_by integer,
    finished_by_username text,
    keterangan text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    files jsonb,
    submitted_by_full_name text,
    approved_by_full_name text,
    CONSTRAINT pengajuan_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'finished'::text])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    full_name text,
    password text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text, 'manager'::text])))
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: nota_counter nota_counter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nota_counter
    ADD CONSTRAINT nota_counter_pkey PRIMARY KEY (year);


--
-- Name: pengajuan pengajuan_no_nota_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengajuan
    ADD CONSTRAINT pengajuan_no_nota_key UNIQUE (no_nota);


--
-- Name: pengajuan pengajuan_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengajuan
    ADD CONSTRAINT pengajuan_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_pengajuan_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pengajuan_status ON public.pengajuan USING btree (status);


--
-- Name: idx_pengajuan_submitted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pengajuan_submitted_at ON public.pengajuan USING btree (submitted_at DESC);


--
-- Name: idx_pengajuan_submitted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pengajuan_submitted_by ON public.pengajuan USING btree (submitted_by);


--
-- Name: pengajuan pengajuan_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengajuan
    ADD CONSTRAINT pengajuan_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: pengajuan pengajuan_finished_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengajuan
    ADD CONSTRAINT pengajuan_finished_by_fkey FOREIGN KEY (finished_by) REFERENCES public.users(id);


--
-- Name: pengajuan pengajuan_rejected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengajuan
    ADD CONSTRAINT pengajuan_rejected_by_fkey FOREIGN KEY (rejected_by) REFERENCES public.users(id);


--
-- Name: pengajuan pengajuan_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pengajuan
    ADD CONSTRAINT pengajuan_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

\unrestrict Pr69QBMXTbbkm7ILGIsT2JFlSe2CaT16Lfe3yQCJETLYeiF0skukNajGkPN1SP6

