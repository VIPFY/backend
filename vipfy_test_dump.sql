--
-- PostgreSQL database dump
--

-- Dumped from database version 9.6.6
-- Dumped by pg_dump version 9.6.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: DATABASE postgres; Type: COMMENT; Schema: -; Owner: cloudsqlsuperuser
--

COMMENT ON DATABASE postgres IS 'default administrative connection database';


--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: 
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: enum_human_data_sex; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_human_data_sex AS ENUM (
    'm',
    'w',
    'u'
);


ALTER TYPE public.enum_human_data_sex OWNER TO postgres;

--
-- Name: enum_partners_view_sex; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_partners_view_sex AS ENUM (
    'm',
    'w',
    'u'
);


ALTER TYPE public.enum_partners_view_sex OWNER TO postgres;

--
-- Name: enum_user_data_sex; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_user_data_sex AS ENUM (
    'm',
    'w',
    'u'
);


ALTER TYPE public.enum_user_data_sex OWNER TO postgres;

--
-- Name: enum_users_sex; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_users_sex AS ENUM (
    'm',
    'w',
    't'
);


ALTER TYPE public.enum_users_sex OWNER TO postgres;

--
-- Name: enum_users_userStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."enum_users_userStatus" AS ENUM (
    'toverify',
    'normal',
    'banned',
    'onlynews'
);


ALTER TYPE public."enum_users_userStatus" OWNER TO postgres;

--
-- Name: enum_users_userstatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_users_userstatus AS ENUM (
    'toverify',
    'normal',
    'banned',
    'onlynews'
);


ALTER TYPE public.enum_users_userstatus OWNER TO postgres;

--
-- Name: enum_users_view_sex; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_users_view_sex AS ENUM (
    'm',
    'w',
    'u'
);


ALTER TYPE public.enum_users_view_sex OWNER TO postgres;

--
-- Name: languages; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.languages AS ENUM (
    'English'
);


ALTER TYPE public.languages OWNER TO postgres;

--
-- Name: userstatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.userstatus AS ENUM (
    'toverify',
    'normal',
    'banned',
    'onlynews'
);


ALTER TYPE public.userstatus OWNER TO postgres;

--
-- Name: insert_company(character varying, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.insert_company(compname character varying, userid integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
declare
newcompid integer; newdepartmentid integer;
begin
insert into companies (name) VALUES (compname) returning id into newcompid;
insert into departments (companyid, name) VALUES (newcompid, 'Main Office') returning departmentid into newdepartmentid; insert into userrights VALUES (userid, newcompid, newdepartmentid, 1); insert into employees (companyid, departmentid, userid, position) VALUES (newcompid, newdepartmentid, userid, 'Admin');
return newcompid;
end;
$$;


ALTER FUNCTION public.insert_company(compname character varying, userid integer) OWNER TO postgres;

--
-- Name: lowecase_right_on_insert(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.lowecase_right_on_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN        
        NEW.type = LOWER(NEW.type);
        RETURN NEW;
    END;
$$;


ALTER FUNCTION public.lowecase_right_on_insert() OWNER TO postgres;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: address_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.address_data (
    id bigint NOT NULL,
    unitid bigint,
    country character(2) NOT NULL,
    address jsonb,
    description text,
    priority integer DEFAULT 0 NOT NULL,
    tag text
);


ALTER TABLE public.address_data OWNER TO postgres;

--
-- Name: adress_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.adress_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.adress_data_id_seq OWNER TO postgres;

--
-- Name: adress_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.adress_data_id_seq OWNED BY public.address_data.id;


--
-- Name: app_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_data (
    id bigint NOT NULL,
    name text,
    commission jsonb,
    logo text,
    description text,
    teaserdescription text,
    website text,
    supportunit bigint,
    images text[],
    features jsonb,
    options jsonb,
    disabled boolean DEFAULT true NOT NULL,
    developer bigint NOT NULL
);


ALTER TABLE public.app_data OWNER TO postgres;

--
-- Name: app_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.app_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.app_data_id_seq OWNER TO postgres;

--
-- Name: app_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.app_data_id_seq OWNED BY public.app_data.id;


--
-- Name: app_details; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_details (
    id bigint,
    name text,
    commission jsonb,
    logo text,
    description text,
    teaserdescription text,
    website text,
    supportunit bigint,
    images text[],
    features jsonb,
    options jsonb,
    disabled boolean,
    developer bigint,
    avgstars numeric,
    cheapestprice numeric,
    cheapestpromo numeric,
    supportwebsite text,
    supportphone text,
    developername text,
    developerwebsite text
);

ALTER TABLE ONLY public.app_details REPLICA IDENTITY NOTHING;


ALTER TABLE public.app_details OWNER TO postgres;

--
-- Name: appimages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appimages (
    id integer NOT NULL,
    appid integer,
    link character varying(50),
    sequence smallint
);


ALTER TABLE public.appimages OWNER TO postgres;

--
-- Name: appimages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.appimages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.appimages_id_seq OWNER TO postgres;

--
-- Name: appimages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.appimages_id_seq OWNED BY public.appimages.id;


--
-- Name: appnotifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.appnotifications (
    id integer NOT NULL,
    type smallint,
    touser integer,
    fromapp integer,
    sendtime timestamp without time zone DEFAULT now(),
    readtime timestamp without time zone,
    deleted boolean DEFAULT false,
    senderdeleted boolean DEFAULT false,
    message text
);


ALTER TABLE public.appnotifications OWNER TO postgres;

--
-- Name: appnotifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.appnotifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.appnotifications_id_seq OWNER TO postgres;

--
-- Name: appnotifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.appnotifications_id_seq OWNED BY public.appnotifications.id;


--
-- Name: apps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.apps (
    id integer NOT NULL,
    developerid integer,
    name character varying(40),
    percentage smallint,
    description text,
    applogo character varying(50),
    versionnumber character varying(10),
    updatedate date,
    teaserdescription text,
    ownpage character varying(50),
    supportwebsite character varying(50),
    supportphone character varying(20),
    modaltype smallint DEFAULT 0
);


ALTER TABLE public.apps OWNER TO postgres;

--
-- Name: apps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.apps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.apps_id_seq OWNER TO postgres;

--
-- Name: apps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.apps_id_seq OWNED BY public.apps.id;


--
-- Name: review_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.review_data (
    unitid integer NOT NULL,
    appid integer NOT NULL,
    reviewdate timestamp without time zone DEFAULT now() NOT NULL,
    stars smallint,
    reviewtext text,
    id integer NOT NULL,
    answerto integer
);


ALTER TABLE public.review_data OWNER TO postgres;

--
-- Name: apps_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.apps_view AS
 SELECT apps.id,
    apps.developerid,
    apps.name,
    apps.percentage,
    apps.description,
    apps.applogo,
    apps.versionnumber,
    apps.updatedate,
    apps.teaserdescription,
    apps.ownpage,
    apps.supportwebsite,
    apps.supportphone,
    apps.modaltype,
    a.avg_stars,
    a.count_stars
   FROM (public.apps
     LEFT JOIN ( SELECT review_data.appid,
            (avg(review_data.stars))::numeric(2,1) AS avg_stars,
            count(review_data.stars) AS count_stars
           FROM public.review_data
          WHERE ((review_data.unitid, review_data.reviewdate) IN ( SELECT review_data_1.unitid AS userid,
                    max(review_data_1.reviewdate) AS max
                   FROM public.review_data review_data_1
                  GROUP BY review_data_1.unitid))
          GROUP BY review_data.appid) a ON ((apps.id = a.appid)));


ALTER TABLE public.apps_view OWNER TO postgres;

--
-- Name: bill_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bill_data (
    id bigint NOT NULL,
    unitid bigint NOT NULL,
    type boolean NOT NULL,
    billtime timestamp without time zone DEFAULT now(),
    paytime timestamp without time zone,
    stornotime timestamp without time zone
);


ALTER TABLE public.bill_data OWNER TO postgres;

--
-- Name: bill_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bill_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.bill_data_id_seq OWNER TO postgres;

--
-- Name: bill_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bill_data_id_seq OWNED BY public.bill_data.id;


--
-- Name: billposition_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.billposition_data (
    id bigint NOT NULL,
    billid bigint NOT NULL,
    positiontext text,
    amount numeric(10,2),
    currency character(3),
    planid bigint,
    vendor bigint
);


ALTER TABLE public.billposition_data OWNER TO postgres;

--
-- Name: billposition_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.billposition_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.billposition_data_id_seq OWNER TO postgres;

--
-- Name: billposition_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.billposition_data_id_seq OWNED BY public.billposition_data.id;


--
-- Name: boughtcompanyplans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.boughtcompanyplans (
    companyid integer NOT NULL,
    appid integer NOT NULL,
    planid integer NOT NULL,
    datebought timestamp without time zone DEFAULT now() NOT NULL,
    planfinish timestamp without time zone,
    key character varying(256),
    lastrenewal timestamp without time zone DEFAULT now(),
    numrenewal integer,
    numlicences integer
);


ALTER TABLE public.boughtcompanyplans OWNER TO postgres;

--
-- Name: boughtplan_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.boughtplan_data (
    id bigint NOT NULL,
    buyer bigint NOT NULL,
    planid bigint NOT NULL,
    buytime timestamp without time zone DEFAULT now() NOT NULL,
    endtime timestamp without time zone,
    key jsonb,
    predecessor bigint,
    disabled boolean DEFAULT false,
    payer bigint NOT NULL
);


ALTER TABLE public.boughtplan_data OWNER TO postgres;

--
-- Name: boughtplan_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.boughtplan_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.boughtplan_data_id_seq OWNER TO postgres;

--
-- Name: boughtplan_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.boughtplan_data_id_seq OWNED BY public.boughtplan_data.id;


--
-- Name: boughtsubplan_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.boughtsubplan_data (
    boughtplanid bigint NOT NULL,
    subplanid bigint NOT NULL
);


ALTER TABLE public.boughtsubplan_data OWNER TO postgres;

--
-- Name: boughtuserplans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.boughtuserplans (
    userid integer NOT NULL,
    appid integer NOT NULL,
    planid integer NOT NULL,
    datebought timestamp without time zone DEFAULT now() NOT NULL,
    planfinish timestamp without time zone,
    key character varying(256),
    lastrenewal timestamp without time zone DEFAULT now(),
    numrenewal integer
);


ALTER TABLE public.boughtuserplans OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name character varying(40),
    companylogo character varying(50),
    addresscountry character varying(20),
    addressstate character varying(20),
    addresscity character varying(20),
    addressstreet character varying(20),
    addressnumber smallint,
    family boolean DEFAULT false
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.companies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.companies_id_seq OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: companybills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companybills (
    companyid integer,
    date timestamp without time zone DEFAULT now(),
    billpos integer,
    textpos character varying(256),
    price money,
    currency character(3),
    appid integer,
    planid integer
);


ALTER TABLE public.companybills OWNER TO postgres;

--
-- Name: department_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.department_data (
    unitid bigint NOT NULL,
    name text,
    legalinformation jsonb,
    staticdata jsonb
);


ALTER TABLE public.department_data OWNER TO postgres;

--
-- Name: human_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.human_data (
    unitid bigint NOT NULL,
    firstname character varying(300) NOT NULL,
    middlename character varying(300) DEFAULT ''::character varying NOT NULL,
    lastname character varying(300) NOT NULL,
    title character varying(50) DEFAULT ''::character varying NOT NULL,
    sex character(1),
    passwordhash text NOT NULL,
    birthday date,
    lastactive timestamp without time zone,
    resetoption integer,
    language text
);


ALTER TABLE public.human_data OWNER TO postgres;

--
-- Name: parentunit_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.parentunit_data (
    parentunit bigint NOT NULL,
    childunit bigint NOT NULL
);


ALTER TABLE public.parentunit_data OWNER TO postgres;

--
-- Name: department_employee_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.department_employee_view AS
 WITH RECURSIVE counter(id, childid, employee) AS (
         SELECT human_data.unitid AS id,
            NULL::bigint AS childid,
            human_data.unitid AS employees
           FROM public.human_data
        UNION ALL
         SELECT parentunit_data.parentunit AS id,
            counter_1.id AS childid,
            counter_1.employee
           FROM (public.parentunit_data
             JOIN counter counter_1 ON ((parentunit_data.childunit = counter_1.id)))
        )
 SELECT counter.id,
    counter.childid,
    counter.employee
   FROM counter;


ALTER TABLE public.department_employee_view OWNER TO postgres;

--
-- Name: unit_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.unit_data (
    id bigint NOT NULL,
    payingoptions jsonb,
    banned boolean DEFAULT false NOT NULL,
    deleted boolean DEFAULT false NOT NULL,
    suspended boolean DEFAULT false NOT NULL,
    profilepicture text,
    riskvalue integer,
    createdate timestamp without time zone DEFAULT now(),
    "position" text
);


ALTER TABLE public.unit_data OWNER TO postgres;

--
-- Name: department_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.department_view AS
 WITH RECURSIVE counter(id, childid, employees) AS (
         SELECT human_data.unitid AS id,
            NULL::bigint AS childid,
            human_data.unitid AS employees
           FROM public.human_data
        UNION ALL
         SELECT parentunit_data.parentunit AS id,
            counter.id AS childid,
            counter.employees
           FROM (public.parentunit_data
             JOIN counter ON ((parentunit_data.childunit = counter.id)))
        )
 SELECT a.unitid,
    a.name,
    a.legalinformation,
    a.staticdata,
    a.profilepicture,
    a.payingoptions,
    a.banned,
    a.suspended,
    a.deleted,
    COALESCE(b.employees, (0)::bigint) AS employees
   FROM (( SELECT department_data.unitid,
            department_data.name,
            department_data.legalinformation,
            department_data.staticdata,
            unit_data.profilepicture,
            unit_data.payingoptions,
            unit_data.banned,
            unit_data.suspended,
            unit_data.deleted
           FROM public.department_data,
            public.unit_data
          WHERE (department_data.unitid = unit_data.id)) a
     LEFT JOIN ( SELECT counter.id,
            count(DISTINCT counter.employees) AS employees
           FROM counter
          GROUP BY counter.id
          ORDER BY counter.id) b ON ((a.unitid = b.id)));


ALTER TABLE public.department_view OWNER TO postgres;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    companyid integer NOT NULL,
    name character varying(40),
    addresscountry character varying(20),
    addressstate character varying(20),
    addresscity character varying(20),
    addressstreet character varying(20),
    addressnumber smallint,
    id integer NOT NULL
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.departments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.departments_id_seq OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.departments_id_seq OWNED BY public.departments.id;


--
-- Name: developers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.developers (
    id integer NOT NULL,
    name character varying(40),
    website character varying(50),
    legalwebsite character varying(50),
    bankaccount character varying(30)
);


ALTER TABLE public.developers OWNER TO postgres;

--
-- Name: developers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.developers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.developers_id_seq OWNER TO postgres;

--
-- Name: developers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.developers_id_seq OWNED BY public.developers.id;


--
-- Name: email_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_data (
    unitid bigint,
    email text NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    autogenerated boolean NOT NULL,
    description text,
    priority integer DEFAULT 0 NOT NULL,
    tag text
);


ALTER TABLE public.email_data OWNER TO postgres;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    companyid integer NOT NULL,
    departmentid integer NOT NULL,
    userid integer NOT NULL,
    begindate date DEFAULT ('now'::text)::date NOT NULL,
    enddate date,
    "position" character varying(20)
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- Name: human_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.human_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.human_data_id_seq OWNER TO postgres;

--
-- Name: human_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.human_data_id_seq OWNED BY public.human_data.unitid;


--
-- Name: licence_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.licence_data (
    unitid bigint NOT NULL,
    boughtplanid bigint NOT NULL,
    options jsonb,
    starttime timestamp without time zone DEFAULT now(),
    endtime timestamp without time zone,
    agreed boolean DEFAULT false,
    disabled boolean DEFAULT false,
    key jsonb
);


ALTER TABLE public.licence_data OWNER TO postgres;

--
-- Name: log_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.log_data (
    id bigint NOT NULL,
    "time" timestamp without time zone NOT NULL,
    "user" bigint,
    sudoer bigint,
    eventtype text NOT NULL,
    eventdata jsonb,
    ip inet
);


ALTER TABLE public.log_data OWNER TO postgres;

--
-- Name: log_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.log_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.log_data_id_seq OWNER TO postgres;

--
-- Name: log_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.log_data_id_seq OWNED BY public.log_data.id;


--
-- Name: login_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.login_view AS
 SELECT human_data.passwordhash,
    email_data.email,
    email_data.verified,
    unit_data.banned,
    unit_data.suspended,
    email_data.unitid,
    unit_data.deleted
   FROM ((public.human_data
     JOIN public.unit_data ON ((unit_data.id = human_data.unitid)))
     JOIN public.email_data ON ((email_data.unitid = human_data.unitid)));


ALTER TABLE public.login_view OWNER TO postgres;

--
-- Name: message_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.message_data (
    id bigint NOT NULL,
    receiver bigint NOT NULL,
    sender bigint NOT NULL,
    sendtime timestamp without time zone DEFAULT now(),
    readtime timestamp without time zone,
    archivetimesender timestamp without time zone,
    archivetimereceiver timestamp without time zone,
    messagetext text,
    tag text[]
);


ALTER TABLE public.message_data OWNER TO postgres;

--
-- Name: message_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.message_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.message_data_id_seq OWNER TO postgres;

--
-- Name: message_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.message_data_id_seq OWNED BY public.message_data.id;


--
-- Name: users_view; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users_view (
    id bigint,
    firstname character varying(300),
    middlename character varying(300),
    lastname character varying(300),
    title character varying(50),
    sex character(1),
    birthday date,
    resetoption integer,
    language text,
    profilepicture text,
    payingoptions jsonb,
    banned boolean,
    deleted boolean,
    suspended boolean,
    riskvalue integer,
    "position" text,
    createdate timestamp without time zone,
    emails json
);

ALTER TABLE ONLY public.users_view REPLICA IDENTITY NOTHING;


ALTER TABLE public.users_view OWNER TO postgres;

--
-- Name: message_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.message_view AS
 SELECT users_view.id AS receiver,
    message_data.sendtime,
    users_view.profilepicture AS senderpicture,
    (((users_view.firstname)::text || ' '::text) || (users_view.lastname)::text) AS sendername,
    message_data.readtime,
    message_data.archivetimesender,
    message_data.archivetimereceiver,
    message_data.tag,
    message_data.messagetext,
    message_data.id
   FROM public.message_data,
    public.users_view
  WHERE (users_view.id = message_data.receiver);


ALTER TABLE public.message_view OWNER TO postgres;

--
-- Name: newsletter_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.newsletter_data (
    email text NOT NULL,
    activesince date DEFAULT now() NOT NULL,
    activeuntil date
);


ALTER TABLE public.newsletter_data OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    type smallint,
    touser integer,
    fromuser integer,
    sendtime timestamp without time zone DEFAULT now(),
    readtime timestamp without time zone,
    deleted boolean DEFAULT false,
    senderdeleted boolean DEFAULT false,
    message text
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: phone_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.phone_data (
    unitid bigint,
    number text NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    autogenerated boolean NOT NULL,
    description text,
    priority integer DEFAULT 0 NOT NULL,
    tag text
);


ALTER TABLE public.phone_data OWNER TO postgres;

--
-- Name: plan_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plan_data (
    id bigint NOT NULL,
    name text,
    appid bigint,
    teaserdescription text,
    features jsonb,
    startdate timestamp without time zone DEFAULT now() NOT NULL,
    enddate timestamp without time zone,
    numlicences integer DEFAULT 1 NOT NULL,
    price numeric(10,2),
    currency character(3),
    options jsonb,
    payperiod interval,
    cancelperiod interval,
    gotoplan bigint,
    optional boolean DEFAULT false,
    mainplan bigint,
    gototime interval
);


ALTER TABLE public.plan_data OWNER TO postgres;

--
-- Name: plan_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plan_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.plan_data_id_seq OWNER TO postgres;

--
-- Name: plan_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plan_data_id_seq OWNED BY public.plan_data.id;


--
-- Name: plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plans (
    id integer NOT NULL,
    appid integer NOT NULL,
    description character varying(256),
    renewalplan integer,
    period integer,
    numlicences integer,
    price numeric(11,2),
    currency character(3),
    name character varying(30),
    activefrom timestamp without time zone,
    activeuntil timestamp without time zone,
    promo smallint,
    promovipfy numeric(11,2),
    promodeveloper numeric(11,2),
    promoname character varying(30),
    changeafter smallint,
    changeplan integer
);


ALTER TABLE public.plans OWNER TO postgres;

--
-- Name: plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.plans_id_seq OWNER TO postgres;

--
-- Name: plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plans_id_seq OWNED BY public.plans.id;


--
-- Name: plans_running; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.plans_running AS
 SELECT plan_data.id,
    plan_data.name,
    plan_data.appid,
    plan_data.teaserdescription,
    plan_data.features,
    plan_data.startdate,
    plan_data.enddate,
    plan_data.numlicences,
    plan_data.price,
    plan_data.currency,
    plan_data.options
   FROM public.plan_data
  WHERE ((plan_data.startdate < now()) AND ((plan_data.enddate > now()) OR (plan_data.enddate IS NULL)));


ALTER TABLE public.plans_running OWNER TO postgres;

--
-- Name: promo_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.promo_data (
    id bigint NOT NULL,
    name text,
    planid bigint,
    startdate timestamp without time zone DEFAULT now() NOT NULL,
    enddate timestamp without time zone,
    restrictions jsonb,
    description text,
    sponsor bigint,
    discount jsonb
);


ALTER TABLE public.promo_data OWNER TO postgres;

--
-- Name: promo_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.promo_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.promo_data_id_seq OWNER TO postgres;

--
-- Name: promo_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.promo_data_id_seq OWNED BY public.promo_data.id;


--
-- Name: promos_running; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.promos_running AS
 SELECT promo_data.id,
    promo_data.name,
    promo_data.planid,
    promo_data.startdate,
    promo_data.enddate,
    promo_data.restrictions,
    promo_data.description,
    promo_data.sponsor,
    promo_data.discount
   FROM public.promo_data
  WHERE ((promo_data.startdate < now()) AND ((promo_data.enddate > now()) OR (promo_data.enddate IS NULL)));


ALTER TABLE public.promos_running OWNER TO postgres;

--
-- Name: reviewhelpful_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviewhelpful_data (
    reviewid integer NOT NULL,
    unitid integer NOT NULL,
    helpfuldate timestamp without time zone DEFAULT now(),
    comment text,
    balance smallint
);


ALTER TABLE public.reviewhelpful_data OWNER TO postgres;

--
-- Name: review_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.review_view AS
 SELECT review_data.id,
    review_data.unitid,
    review_data.appid,
    review_data.reviewdate,
    review_data.stars,
    review_data.reviewtext,
    review_data.answerto,
    count(*) FILTER (WHERE (reviewhelpful_data.balance = 1)) AS counthelpful,
    count(*) FILTER (WHERE (reviewhelpful_data.balance = 2)) AS countunhelpful,
    count(*) FILTER (WHERE (reviewhelpful_data.balance = 0)) AS countcomment
   FROM (public.review_data
     LEFT JOIN public.reviewhelpful_data ON ((review_data.id = reviewhelpful_data.reviewid)))
  GROUP BY review_data.unitid, review_data.appid, review_data.reviewdate, review_data.stars, review_data.reviewtext, review_data.id, review_data.answerto
  ORDER BY review_data.reviewdate DESC;


ALTER TABLE public.review_view OWNER TO postgres;

--
-- Name: reviewhelpful; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviewhelpful (
    helpfuldate timestamp with time zone,
    comment text,
    balance integer,
    reviewid integer,
    unitid integer
);


ALTER TABLE public.reviewhelpful OWNER TO postgres;

--
-- Name: reviews; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.reviews AS
 SELECT review_data.unitid AS userid,
    review_data.appid,
    review_data.reviewdate,
    review_data.stars,
    review_data.reviewtext,
    review_data.id,
    review_data.answerto
   FROM public.review_data;


ALTER TABLE public.reviews OWNER TO postgres;

--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.reviews_id_seq OWNER TO postgres;

--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.review_data.id;


--
-- Name: right_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.right_data (
    holder bigint,
    forunit bigint,
    type character varying(20)
);


ALTER TABLE public.right_data OWNER TO postgres;

--
-- Name: speaks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.speaks (
    userid integer NOT NULL,
    language public.languages DEFAULT 'English'::public.languages NOT NULL,
    preferred boolean DEFAULT false
);


ALTER TABLE public.speaks OWNER TO postgres;

--
-- Name: unit_data_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.unit_data_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.unit_data_id_seq OWNER TO postgres;

--
-- Name: unit_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.unit_data_id_seq OWNED BY public.unit_data.id;


--
-- Name: usedcompanyplans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usedcompanyplans (
    userid integer NOT NULL,
    appid integer NOT NULL,
    planid integer NOT NULL,
    companyid integer NOT NULL,
    planbought timestamp without time zone NOT NULL,
    key character varying(256),
    usedfrom timestamp without time zone DEFAULT now() NOT NULL,
    usedto timestamp without time zone
);


ALTER TABLE public.usedcompanyplans OWNER TO postgres;

--
-- Name: userbills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.userbills (
    userid integer NOT NULL,
    date timestamp without time zone DEFAULT now() NOT NULL,
    billpos integer NOT NULL,
    textpos character varying(256),
    price numeric(11,2),
    currency character(3),
    appid integer,
    planid integer,
    orgcurrency character(3),
    exchangerate numeric(20,10)
);


ALTER TABLE public.userbills OWNER TO postgres;

--
-- Name: userrights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.userrights (
    userid integer NOT NULL,
    companyid integer NOT NULL,
    departmentid integer NOT NULL,
    userright integer NOT NULL
);


ALTER TABLE public.userrights OWNER TO postgres;

--
-- Name: users_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users_data (
    id integer NOT NULL,
    firstname character varying(255),
    middlename character varying(255),
    lastname character varying(255),
    "position" character varying(255),
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    title character varying(255),
    sex character(1),
    userstatus public."enum_users_userStatus" DEFAULT 'toverify'::public."enum_users_userStatus",
    birthday date,
    recoveryemail character varying(255),
    mobilenumber character varying(255),
    telefonnumber character varying(255),
    addresscountry character varying(255),
    addressstate character varying(255),
    addresscity character varying(255),
    addressstreet character varying(255),
    addressnumber character varying(10),
    profilepicture character varying(255),
    lastactive timestamp with time zone,
    lastsecret character varying(255),
    riskvalue integer,
    newsletter boolean DEFAULT false,
    referall integer DEFAULT 0,
    cobranded integer DEFAULT 0,
    resetoption integer DEFAULT 0,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users_data OWNER TO postgres;

--
-- Name: users; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.users AS
 SELECT users_data.id,
    users_data.firstname,
    users_data.middlename,
    users_data.lastname,
    users_data."position",
    users_data.email,
    users_data.password,
    users_data.title,
    users_data.sex,
    users_data.userstatus,
    users_data.birthday,
    users_data.recoveryemail,
    users_data.mobilenumber,
    users_data.telefonnumber,
    users_data.addresscountry,
    users_data.addressstate,
    users_data.addresscity,
    users_data.addressstreet,
    users_data.addressnumber,
    users_data.profilepicture,
    users_data.lastactive,
    users_data.lastsecret,
    users_data.riskvalue,
    users_data.newsletter,
    users_data.referall,
    users_data.cobranded,
    users_data.resetoption,
    users_data."createdAt",
    users_data."updatedAt"
   FROM public.users_data;


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users_data.id;


--
-- Name: website_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.website_data (
    website text NOT NULL,
    unitid bigint,
    tag text,
    verified boolean DEFAULT false NOT NULL,
    autogenerated boolean NOT NULL,
    description text,
    priority integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.website_data OWNER TO postgres;

--
-- Name: address_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_data ALTER COLUMN id SET DEFAULT nextval('public.adress_data_id_seq'::regclass);


--
-- Name: app_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_data ALTER COLUMN id SET DEFAULT nextval('public.app_data_id_seq'::regclass);


--
-- Name: appimages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appimages ALTER COLUMN id SET DEFAULT nextval('public.appimages_id_seq'::regclass);


--
-- Name: appnotifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appnotifications ALTER COLUMN id SET DEFAULT nextval('public.appnotifications_id_seq'::regclass);


--
-- Name: apps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.apps ALTER COLUMN id SET DEFAULT nextval('public.apps_id_seq'::regclass);


--
-- Name: bill_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_data ALTER COLUMN id SET DEFAULT nextval('public.bill_data_id_seq'::regclass);


--
-- Name: billposition_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billposition_data ALTER COLUMN id SET DEFAULT nextval('public.billposition_data_id_seq'::regclass);


--
-- Name: boughtplan_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtplan_data ALTER COLUMN id SET DEFAULT nextval('public.boughtplan_data_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments ALTER COLUMN id SET DEFAULT nextval('public.departments_id_seq'::regclass);


--
-- Name: developers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developers ALTER COLUMN id SET DEFAULT nextval('public.developers_id_seq'::regclass);


--
-- Name: log_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_data ALTER COLUMN id SET DEFAULT nextval('public.log_data_id_seq'::regclass);


--
-- Name: message_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_data ALTER COLUMN id SET DEFAULT nextval('public.message_data_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: plan_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_data ALTER COLUMN id SET DEFAULT nextval('public.plan_data_id_seq'::regclass);


--
-- Name: plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans ALTER COLUMN id SET DEFAULT nextval('public.plans_id_seq'::regclass);


--
-- Name: promo_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_data ALTER COLUMN id SET DEFAULT nextval('public.promo_data_id_seq'::regclass);


--
-- Name: review_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_data ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: unit_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_data ALTER COLUMN id SET DEFAULT nextval('public.unit_data_id_seq'::regclass);


--
-- Name: users_data id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_data ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: address_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.address_data (id, unitid, country, address, description, priority, tag) FROM stdin;
3	7	NL	{"city": "Maastricht", "street": "Bluntway 12"}	Chill Place	1	\N
4	7	NL	{"city": "Maastricht", "street": "Bluntway 12"}	Chill Place	1	\N
5	7	DE	{"city": "Saarbrücken", "street": "Hellwigstraße 4"}	Work Place	0	\N
6	7	DE	{"city": "Saarbrücken", "street": "Hellwigstraße 4"}	Work Place	0	\N
7	7	EN	{"city": "London", "street": "Englishstreet 54"}	Royal Castle	0	\N
2	7	PL	{"city": "Pilsen", "street": "Thiefstreet 2"}	Garage	0	\N
8	7	NL	{"city": "Maastricht", "street": "High Road 12"}	Chill Place	3	\N
9	7	TH	{"city": "Maastricht", "street": "Thai Road 12"}	Third Wife Place	1	\N
\.


--
-- Name: adress_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.adress_data_id_seq', 9, true);


--
-- Data for Name: app_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_data (id, name, commission, logo, description, teaserdescription, website, supportunit, images, features, options, disabled, developer) FROM stdin;
3	Slack	\N	slack.svg	Cloud-based team collaboration tool that offers persistent chat rooms (channels) organized by topic, as well as private groups and direct messaging. All content inside Slack is searchable, including files, conversations, and people	Cloud-based team collaboration tool that offers persistent chat rooms (channels) organized by topic, as well as private groups and direct messaging. All content inside Slack is searchable, including files, conversations, and people	https://slack.com	22	{Slack.png,Slack2.png,Slack3.jpg,Slack4.png}	\N	\N	t	13
6	Moo	\N	Moo-logo.png	Premium Business Cards, Luxe Business Cards, Postcards, Stickers and more	Premium Business Cards, Luxe Business Cards, Postcards, Stickers and more	https://moo.com	22	{Moo.jpg,Moo2.jpg,Moo3.jpeg}	\N	\N	t	16
7	Vistaprint	\N	vistaprint_2014_logo_detail.png	Printing and real-time design help	Printing and real-time design help	https://vistaprint.com	22	{Vistaprint.jpg,Vistaprint2.jpg,Vistaprint3.jpg}	\N	\N	t	17
9	Waveapps	\N	wave.png	Create and send professional invoices, estimates and receipts in seconds. Track the status of your invoices and payments so you can know when to expect money in your bank account	Create and send professional invoices, estimates and receipts in seconds. Track the status of your invoices and payments so you can know when to expect money in your bank account	https://waveapps.com	22	{Waveapps.png,Waveapps2.jpg,Waveapps3.png,Waveapps4.jpg}	\N	\N	t	19
10	Waveapps	\N	xero.svg	Online accounting software for your small business	Online accounting software for your small business	https://xero.com	22	{Xero.jpg,Xero2.png,Xero3.png,Xero4.png}	\N	\N	t	20
11	DD24	\N	dd24.png	Web-hosting service featuring a drag-and-drop website builder. Include a Shop- and Newsletter-Plugin	Web-hosting service featuring a drag-and-drop website builder. Include a Shop- and Newsletter-Plugin	https://dd24.net	22	{dd24.png,dd24_2.png,dd24_3.jpg,dd24_4.jpg}	\N	\N	t	21
8	CakeHr	\N	cake.png	Manage employee leave and time off. Detailed employee and company reports	Manage Employees better	https://cakehr.com	22	{CakeHR.png,CakeHR2.png,CakeHR3.png,CakeHR4.jpg}	\N	\N	t	18
5	Google Apps	\N	google-apps.svg	All you need to do your best work, together in one package that works seamlessly from your computer, phone or tablet	All you need to do your best work, together in one package that works seamlessly from your computer, phone or tablet	https://gsuite.google.com	22	{Google_Apps.png,Google-Apps2.png,Google_Apps3.png,Google-Apps4.png}	\N	\N	t	15
2	Weebly	\N	weebly.svg	Web-hosting service featuring a drag-and-drop website builder. Include a Shop- and Newsletter-Plugin	Web-hosting service featuring a drag-and-drop website builder. Include a Shop- and Newsletter-Plugin	https://weebly.com	22	{Weebly.jpeg,Weebly2.png,Weebly3.jpg,Weebly4.png}	\N	\N	t	12
4	Pipedrive	{"text": "No commission"}	pipedrive.svg	The leading sales management tool small teams love to use.	The leading sales management tool small teams love to use.	https://pipedrive.com	22	{Pipedrive.png,Pipedrive2.png,Pipedrive3.png,Pipedrive4.png}	{"name": "Test"}	{"agb": "test.html", "privacy": "privacy.html"}	t	14
\.


--
-- Name: app_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.app_data_id_seq', 17, true);


--
-- Data for Name: appimages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appimages (id, appid, link, sequence) FROM stdin;
1	1	Weebly.jpeg	\N
2	1	Weebly2.png	\N
3	1	Weebly3.jpg	\N
4	1	Weebly4.png	\N
5	2	Slack.png	\N
6	2	Slack2.png	\N
7	2	Slack3.jpg	\N
8	2	Slack4.png	\N
9	3	Pipedrive.png	\N
10	3	Pipedrive2.png	\N
11	3	Pipedrive3.png	\N
12	3	Pipedrive4.png	\N
13	4	Google_Apps.png	\N
14	4	Google-Apps2.png	\N
15	4	Google_Apps3.png	\N
16	4	Google-Apps4.png	\N
17	5	Moo.jpg	\N
18	5	Moo2.jpg	\N
19	5	Moo3.jpeg	\N
20	6	Vistaprint.jpg	\N
21	6	Vistaprint2.jpg	\N
22	6	Vistaprint3.png	\N
23	6	Vistaprint4.jpg	\N
24	7	CakeHR.png	\N
25	7	CakeHR2.png	\N
26	7	CakeHR3.png	\N
27	7	CakeHR4.jpg	\N
28	8	Xero.jpg	\N
29	8	Xero2.png	\N
30	8	Xero3.png	\N
31	8	Xero4.png	\N
32	9	Waveapps.png	\N
33	9	Waveapps2.jpg	\N
34	9	Waveapps3.png	\N
35	9	Waveapps4.jpg	\N
36	11	dd24.png	\N
37	11	dd24_2.png	\N
38	11	dd24_3.jpg	\N
39	11	dd24_4.jpg	\N
\.


--
-- Name: appimages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.appimages_id_seq', 39, true);


--
-- Data for Name: appnotifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.appnotifications (id, type, touser, fromapp, sendtime, readtime, deleted, senderdeleted, message) FROM stdin;
1	1	61	4	2017-12-26 21:32:28.683334	2017-12-27 18:49:46.641	t	f	Domo Arigato, Mr. Roboto
2	1	61	4	2017-12-28 15:17:04.068985	\N	f	f	...that was when I ruled the world.
3	1	67	4	2017-12-31 13:32:58.75916	\N	f	f	...that was when I ruled the world.
5	1	67	2	2017-12-31 13:33:29.747131	\N	f	f	Oh ho hoho hoho...
\.


--
-- Name: appnotifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.appnotifications_id_seq', 5, true);


--
-- Data for Name: apps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.apps (id, developerid, name, percentage, description, applogo, versionnumber, updatedate, teaserdescription, ownpage, supportwebsite, supportphone, modaltype) FROM stdin;
2	2	Slack	\N	Cloud-based team collaboration tool that offers persistent chat rooms (channels) organized by topic, as well as private groups and direct messaging. All content inside Slack is searchable, including files, conversations, and people	slack.svg	\N	\N	\N	\N	\N	\N	0
3	3	Pipedrive	\N	The leading sales management tool small teams love to use.	pipedrive.svg	\N	\N	\N	\N	\N	\N	0
4	4	Google Apps	\N	All you need to do your best work, together in one package that works seamlessly from your computer, phone or tablet	google-apps.svg	\N	\N	\N	\N	\N	\N	0
5	5	Moo	\N	Premium Business Cards, Luxe Business Cards, Postcards, Stickers and more	Moo-logo.png	\N	\N	\N	\N	\N	\N	0
6	6	Vistaprint	\N	Printing and real-time design help	vistaprint_2014_logo_detail.png	\N	\N	\N	\N	\N	\N	0
7	7	CakeHR	\N	Manage employee leave and time off. Detailed employee and company reports	cake.png	\N	\N	\N	\N	\N	\N	0
8	8	Xero	\N	Online accounting software for your small business	xero.svg	\N	\N	\N	\N	\N	\N	0
9	9	Waveapps	\N	Create and send professional invoices, estimates and receipts in seconds. Track the status of your invoices and payments so you can know when to expect money in your bank account	wave.png	\N	\N	\N	\N	\N	\N	0
11	20	DD24	\N	User-friendly retail customer portal for domain registration and management	dd24.png	\N	\N	\N	\N	\N	\N	1
1	1	Weebly	\N	Web-hosting service featuring a drag-and-drop website builder. Include a Shop- and Newsletter-Plugin	weebly.svg	\N	\N	\N	\N	\N	\N	0
\.


--
-- Name: apps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.apps_id_seq', 11, true);


--
-- Data for Name: bill_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bill_data (id, unitid, type, billtime, paytime, stornotime) FROM stdin;
\.


--
-- Name: bill_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bill_data_id_seq', 1, false);


--
-- Data for Name: billposition_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.billposition_data (id, billid, positiontext, amount, currency, planid, vendor) FROM stdin;
\.


--
-- Name: billposition_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.billposition_data_id_seq', 1, false);


--
-- Data for Name: boughtcompanyplans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.boughtcompanyplans (companyid, appid, planid, datebought, planfinish, key, lastrenewal, numrenewal, numlicences) FROM stdin;
\.


--
-- Data for Name: boughtplan_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.boughtplan_data (id, buyer, planid, buytime, endtime, key, predecessor, disabled, payer) FROM stdin;
1	7	1	2018-03-27 11:47:31.949	\N	{"amount": 10}	\N	f	7
2	7	1	2018-03-27 11:49:01.323	\N	{"amount": 10}	\N	f	7
3	7	2	2018-03-27 11:52:09.948	\N	{"amount": 10}	\N	f	7
\.


--
-- Name: boughtplan_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.boughtplan_data_id_seq', 4, true);


--
-- Data for Name: boughtsubplan_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.boughtsubplan_data (boughtplanid, subplanid) FROM stdin;
\.


--
-- Data for Name: boughtuserplans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.boughtuserplans (userid, appid, planid, datebought, planfinish, key, lastrenewal, numrenewal) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companies (id, name, companylogo, addresscountry, addressstate, addresscity, addressstreet, addressnumber, family) FROM stdin;
1	Yost - Predovic	http://lorempixel.com/640/480/business	Finland	Texas	Gabrielview	Taylor Light	12952	f
2	Kunde - Harvey	http://lorempixel.com/640/480/business	Uganda	West Virginia	Nolanhaven	Maritza Viaduct	14623	f
3	Hoppe, Swaniawski and Steuber	http://lorempixel.com/640/480/business	Faroe Islands	New Mexico	West Jasenstad	Marks Walks	17440	f
4	Schinner Group	http://lorempixel.com/640/480/business	Malaysia	Utah	New Emeraldtown	Colten Turnpike	3544	f
5	Streich Group	http://lorempixel.com/640/480/business	Faroe Islands	California	Anissafurt	Brennon Ranch	20618	f
6	Torp, Dickinson and Quitzon	http://lorempixel.com/640/480/business	Gambia	Colorado	New Enosberg	Lia Shoal	9	f
7	Jacobs - Miller	http://lorempixel.com/640/480/business	Saint Martin	Nevada	South Rossie	Franecki Lodge	9	f
8	Bosco Inc	http://lorempixel.com/640/480/business	Reunion	Utah	South Ellen	Efren River	2	f
9	Shields - Hilpert	http://lorempixel.com/640/480/business	Peru	South Dakota	West Adolfo	Theodora Mall	2	f
10	Rutherford Group	http://lorempixel.com/640/480/business	Djibouti	North Dakota	North Sandraburgh	Jamison Stream	3	f
11	Langosh Inc	http://lorempixel.com/640/480/business	Mali	Nebraska	South Ephraimberg	Loren Passage	6	f
12	Collier and Sons	http://lorempixel.com/640/480/business	Ireland	Massachusetts	South Dessieport	Zelma Lights	8	f
13	Bartell Inc	http://lorempixel.com/640/480/business	Malawi	Delaware	Stantonburgh	Haley Run	6	f
14	Mayer LLC	http://lorempixel.com/640/480/business	Burundi	Tennessee	East Gracieside	Koelpin Way	5	f
15	Mitchell, Rice and Douglas	http://lorempixel.com/640/480/business	Senegal	Wyoming	New Travon	Fahey Plains	3	f
17	Testcomp	\N	\N	\N	\N	\N	\N	f
19	Testcomp2	\N	\N	\N	\N	\N	\N	f
\.


--
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.companies_id_seq', 19, true);


--
-- Data for Name: companybills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.companybills (companyid, date, billpos, textpos, price, currency, appid, planid) FROM stdin;
\.


--
-- Data for Name: department_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.department_data (unitid, name, legalinformation, staticdata) FROM stdin;
12	Weebly	\N	\N
13	Slack	\N	\N
14	Pipedrive	\N	\N
15	Google Apps	\N	\N
17	Vistaprint	\N	\N
16	Moo	\N	\N
18	CakeHr	\N	\N
19	Wave	\N	\N
20	Xero	\N	\N
21	DD24	\N	\N
25	Vipfy	\N	\N
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.departments (companyid, name, addresscountry, addressstate, addresscity, addressstreet, addressnumber, id) FROM stdin;
8	Jewelery	Argentina	Ohio	Port Cassie	Greenholt Roads	8	1
4	Industrial	Antigua and Barbuda	Vermont	New Michelle	Ankunding Summit	1	2
3	Garden	Republic of Korea	Nevada	Lake Kelli	Kuvalis Island	5	3
2	Games	United Kingdom	Connecticut	East Tobyburgh	Lehner Valleys	5	4
5	Automotive	Antigua and Barbuda	Montana	South Jacksonfort	Kuphal Stravenue	3	5
1	Games	Cuba	Arizona	Port Jakayla	Andy Wells	6	6
10	Electronics	Solomon Islands	New Jersey	Wilfordside	Cremin River	1	7
1	Sports	Honduras	West Virginia	Nolanview	Marks Parkway	2	8
3	Books	Liberia	Oregon	Abigaylemouth	Carter Trail	8	9
9	Sports	Niger	New Hampshire	Erickport	Justyn Light	7	10
17	Main Office	\N	\N	\N	\N	\N	11
19	Main Office	\N	\N	\N	\N	\N	12
\.


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.departments_id_seq', 12, true);


--
-- Data for Name: developers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.developers (id, name, website, legalwebsite, bankaccount) FROM stdin;
1	Weebly, Inc	https://weebly.com	https://www.weebly.com/de/terms-of-service	555-555-555
2	Slack Technologies	https://slack.com	https://slack.com/terms-of-service	\N
3	Pipedrive Inc	https://pipedrive.com	https://pipedrive.com/terms-of-service	\N
4	Google Inc	https://gsuite.google.com	https://google.com/intl/policies/terms	\N
5	Moo Print Limited	https://moo.com	https://www.moo.com/about/terms-conditions.html	\N
6	Cimpress N.V.	vistaprint.com	vistaprint.com/customer-care/terms-of-use.aspx	\N
7	HR Bakery Limited	https://cake.hr	https://cake.hr/terms-and-conditions	\N
8	Xero Limited	https://xero.com	https://www.xero.com/about/terms/	\N
9	Wave Accounting	https://waveapps.com	https://my.waveapps.com/terms/	\N
10	Koelpin Inc	agustina.org	darrick.org	46235644
11	Little Inc	kenyatta.biz	whitney.org	87417625
12	Grimes Group	syble.net	edna.name	73447675
13	Rodriguez, Streich and Gerhold	julie.com	eva.net	58289295
14	Sporer Inc	connie.org	king.com	85999567
15	Rath LLC	dianna.org	kelton.info	59107656
16	Schmitt Inc	francesca.net	alexis.net	75106297
17	Volkman and Sons	erika.info	willy.com	82258162
18	Predovic and Sons	nelle.com	carmela.info	71511280
19	Bernhard - Heaney	heath.biz	peggie.name	41188455
20	Key-Systems GmbH	https://www.domaindiscount24.com/en	https://www.domaindiscount24.com/en/legal/imprint	\N
\.


--
-- Name: developers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.developers_id_seq', 20, true);


--
-- Data for Name: email_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.email_data (unitid, email, verified, autogenerated, description, priority, tag) FROM stdin;
7	pc@vipfy.com	t	f	\N	0	\N
7	pc@vip.de	f	f	\N	0	\N
72	hans@wurst.com	t	f	\N	0	\N
22	nv@vipfy.com	t	f	\N	0	\N
67	jf@vipfy.com	t	f	\N	0	\N
31	mm@vipfy.com	t	f	\N	0	\N
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.employees (companyid, departmentid, userid, begindate, enddate, "position") FROM stdin;
19	12	61	2017-12-06	\N	Admin
\.


--
-- Data for Name: human_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.human_data (unitid, firstname, middlename, lastname, title, sex, passwordhash, birthday, lastactive, resetoption, language) FROM stdin;
70	Deleted		User		\N	$YeOC.exJhAZ8Ykb6.1m6L.53WuLz.QZ2z881PgopEMHvpOzZ3NRfK	\N	\N	\N	\N
71	Deleted		User		\N	$05$NXJpgj1um0NJEGc2IK.POOORtPJBuHERI0XkcULeHHnqRHgPhIHA6	\N	\N	\N	\N
7	Pascal		Clanget	Sire	m	$2a$12$EMPo75unK5FrkCIZi1vfsOAkKtaKoT8mwbOVunTe9pA0D7YeNQND2	1984-03-29	\N	\N	German
22	Nils		Vossebein	Young Sire	m	$2a$12$kukINus97OHTkpbZOxV/verAqnv.9jhDuOuI/WxB4XSystzjfuBLq	\N	\N	\N	\N
72	Hans		Wurst		\N	$2a$12$YQglo7m5LWbBOBkdiftuy.SX1njK7wJ4Q3ryh5XiBGPORYomYQwCm	\N	\N	\N	\N
67	Jannis		Froese	CTO	m	$2a$12$MylBhmLQIrkhjiT6HfjuEuDMk2QRQ6u8LHIn8SyK6IaCvhX6Xlwfq	\N	\N	\N	\N
31	Markus		Müller	Weasel	m	$2a$12$vqHMpWuqokWc8.f7PtS3fuFm6i20NxRZZAxY6wK1MmUUFWc2F6h8G	1982-01-12	\N	\N	\N
\.


--
-- Name: human_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.human_data_id_seq', 17, true);


--
-- Data for Name: licence_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.licence_data (unitid, boughtplanid, options, starttime, endtime, agreed, disabled, key) FROM stdin;
7	1	\N	2018-03-27 11:47:31.940438	\N	t	t	\N
7	3	\N	2018-03-27 11:52:09.936716	\N	t	t	\N
\.


--
-- Data for Name: log_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.log_data (id, "time", "user", sudoer, eventtype, eventdata, ip) FROM stdin;
\.


--
-- Name: log_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.log_data_id_seq', 1, false);


--
-- Data for Name: message_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.message_data (id, receiver, sender, sendtime, readtime, archivetimesender, archivetimereceiver, messagetext, tag) FROM stdin;
1	22	7	2018-02-26 19:15:19.527	\N	\N	\N	First message new format	\N
8	7	22	2018-03-01 18:14:35.045439	\N	\N	\N	Test	\N
9	7	22	2018-03-01 18:14:35.045439	\N	\N	\N	Test	\N
4	7	22	2018-03-01 18:14:35.045439	\N	\N	\N	Test Message	\N
5	7	22	2018-03-01 18:14:35.045439	\N	\N	\N	Test	\N
11	22	7	2018-03-01 18:19:18.521	\N	\N	\N	hallo	\N
12	22	7	2018-03-07 14:41:30.262901	\N	\N	\N	Test Refetcg	\N
13	7	22	2018-03-08 20:55:37.563	\N	\N	\N	Hi	\N
14	7	22	2018-04-05 22:37:40.235	\N	\N	\N	Hi funktioniert es?	\N
7	7	22	2018-03-01 18:14:35.045439	2018-05-09 13:20:45.985	\N	\N	Test	\N
16	72	7	2018-05-10 14:21:29.872	\N	\N	\N	Looking still good, bro	\N
17	72	7	2018-05-10 14:21:36.215	\N	\N	\N	Looking bad, bro	\N
15	72	7	2018-05-10 14:21:20.996	2018-05-10 14:21:59.444	\N	\N	Looking good, bro	\N
\.


--
-- Name: message_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.message_data_id_seq', 17, true);


--
-- Data for Name: newsletter_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.newsletter_data (email, activesince, activeuntil) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, type, touser, fromuser, sendtime, readtime, deleted, senderdeleted, message) FROM stdin;
66	1	67	23	2018-01-12 15:42:58.9966	\N	f	f	Was zur Hölle passiert hier?
67	1	67	23	2018-01-12 15:44:06.503431	\N	f	f	WTF is going on here??
68	1	67	23	2018-01-12 15:46:16.56606	\N	f	f	Was zur Hölle passiert hier?
69	1	67	23	2018-01-12 15:48:53.506161	\N	f	f	Was zur Hölle passiert hier?
70	1	67	23	2018-01-12 15:50:37.51543	\N	f	f	Was zur Hölle passiert hier?
71	1	67	23	2018-01-12 15:51:38.099841	\N	f	f	Was zur Hölle passiert hier?
72	1	67	23	2018-01-12 15:52:03.334918	\N	f	f	Was zur Hölle passiert hier?
73	1	67	23	2018-01-12 15:53:02.848861	\N	f	f	Was zur Hölle passiert hier?
74	1	67	23	2018-01-12 15:53:27.642579	\N	f	f	Was zur Hölle passiert hier?
75	1	67	23	2018-01-12 15:54:51.891787	\N	f	f	Was zur Hölle passiert hier?
76	1	67	23	2018-01-12 15:56:50.136566	\N	f	f	Was zur Hölle passiert hier?
77	1	67	23	2018-01-12 16:02:40.392743	\N	f	f	Was zur Hölle passiert hier?
78	1	67	23	2018-01-12 16:10:01.186606	\N	f	f	WTF??
79	1	67	23	2018-01-12 16:15:35.173755	\N	f	f	WTF??
80	1	67	23	2018-01-12 16:16:12.145731	\N	f	f	WTF!!!
81	1	67	23	2018-01-12 16:17:51.116476	\N	f	f	Wie sieht es aus?
82	1	67	23	2018-01-12 16:20:19.385491	\N	f	f	Hardgecoded kommt mal was an
83	1	67	23	2018-01-12 16:21:13.770409	\N	f	f	Es wird wärmer
5	1	8	6	2017-12-28 22:26:26.056915	\N	f	f	Hello, you fool, how are you?
7	1	8	6	2017-12-28 23:25:37.882684	\N	f	f	From the man who sold the world...
8	1	6	6	2017-12-28 23:25:46.129958	\N	f	f	From the man who sold the world...
9	1	7	6	2017-12-29 00:50:10.788256	\N	f	f	Are u motherfucking ready for the new shit?
10	1	7	6	2017-12-29 00:50:40.594263	\N	f	f	ABubble bubble bitch bitch rebel rebel party?
11	1	7	6	2017-12-29 00:50:44.635054	\N	f	f	ABubble bubble bitch bitch rebel rebel party?
12	1	7	6	2017-12-29 00:50:48.959463	\N	f	f	Bubble bubble bitch bitch rebel rebel party?
1	1	61	4	2017-12-26 13:34:13.454858	2017-12-26 19:42:54.676	t	f	Hello Darkness my little friend...
4	1	61	4	2017-12-28 14:04:55.122692	\N	f	f	Last friday night, ...
3	1	61	4	2017-12-28 14:04:36.673216	2017-12-28 15:27:03.941	f	f	I kissed a girl, and I liked it...
2	1	61	4	2017-12-26 19:52:41.105415	2017-12-26 19:52:46.689	t	t	I have come to see you again...
13	1	61	4	2017-12-31 12:00:14.218463	\N	f	f	New Test
16	1	67	21	2017-12-31 13:34:08.271568	\N	f	f	Auf gute Freunde...
17	1	67	21	2017-12-31 13:34:17.53537	\N	f	f	Verlorne Liebe
18	1	67	1	2017-12-31 13:34:28.244488	\N	f	f	Alte Götter
19	1	67	11	2017-12-31 13:34:43.035715	\N	f	f	... und auf neue Ziele
20	1	67	14	2018-01-11 12:48:16.093196	\N	f	f	Free the animal!
21	1	67	17	2018-01-11 12:49:23.425749	\N	f	f	I love u so, treasure from the roof!
22	1	67	17	2018-01-11 12:54:03.06072	\N	f	f	Just cut me up and throw me down
23	1	67	17	2018-01-11 13:39:43.96224	\N	f	f	Wannsee wannsee wann seh ich dich endlich wieder?!
24	1	67	17	2018-01-11 13:44:51.48789	\N	f	f	Du bist Boss, wenn jeder zweifelnde Ruf verstummt.
25	1	67	22	2018-01-11 13:49:50.008083	\N	f	f	weil der Wille zum Erfolg durch deine Blutbahnen pumpt.
26	1	67	27	2018-01-11 13:53:43.108221	\N	f	f	Auf den ganz normalen Wahnsinn.
27	1	61	27	2018-01-11 16:43:08.971575	\N	f	f	Hallo Nils
28	1	61	67	2018-01-11 16:43:27.060875	\N	f	f	Wie gehts?
29	1	61	67	2018-01-11 16:48:43.375283	\N	f	f	Die Idee ist phänomenal!!!
30	1	61	67	2018-01-11 16:48:53.662317	\N	f	f	Die Idee ist ganz okay
31	1	61	67	2018-01-12 11:32:26.307039	\N	f	f	Whaaaaaaaaz up dawg?
32	1	61	67	2018-01-12 11:33:22.342974	\N	f	f	Wanna buy some weeeed?
33	1	67	2	2018-01-12 11:46:07.930287	\N	f	f	Mr Moon, Mr Moon, maybe your time is coming...
34	1	67	2	2018-01-12 11:51:38.557507	\N	f	f	It was given as a promise to even every man
35	1	67	2	2018-01-12 11:56:54.330793	\N	f	f	I wann love u but I m growing old
36	1	67	2	2018-01-12 12:08:47.031047	\N	f	f	Ten little soldiers screaming in my soul
37	1	67	2	2018-01-12 12:10:47.876431	\N	f	f	Unstoppable today
38	1	67	2	2018-01-12 12:19:02.5302	\N	f	f	Bird set free
39	1	67	2	2018-01-12 12:20:40.273439	\N	f	f	for a fee
40	1	67	2	2018-01-12 12:27:34.783133	\N	f	f	Please work u devil!
41	1	67	2	2018-01-12 12:32:16.638122	\N	f	f	Wooooooork!!
42	1	67	2	2018-01-12 12:34:02.145429	\N	f	f	Another Test!!
43	1	67	2	2018-01-12 12:36:41.511242	\N	f	f	And another Test!!
44	1	67	2	2018-01-12 12:40:11.746876	\N	f	f	And another Test! Again!
45	1	67	2	2018-01-12 12:41:03.633415	\N	f	f	And another Test! Again an again!
46	1	67	2	2018-01-12 12:43:54.107643	\N	f	f	Please work!
47	1	67	2	2018-01-12 12:56:42.003376	\N	f	f	One Step forward!
48	1	67	2	2018-01-12 12:57:24.967896	\N	f	f	Next Step forward!
49	1	67	2	2018-01-12 12:59:02.790029	\N	f	f	2 Step forward!
50	1	67	2	2018-01-12 13:00:43.768847	\N	f	f	2 forward!
51	1	67	2	2018-01-12 13:01:30.481597	\N	f	f	2 f2orward!
52	1	67	2	2018-01-12 13:02:06.614893	\N	f	f	2 234!
53	1	67	2	2018-01-12 13:02:49.630379	\N	f	f	Will it work?!
54	1	67	2	2018-01-12 13:03:28.971232	\N	f	f	Will it work now?!
55	1	67	2	2018-01-12 13:05:58.05847	\N	f	f	Will it work now??????????!
56	1	67	2	2018-01-12 15:01:44.062388	\N	f	f	1
57	1	67	2	2018-01-12 15:07:15.732508	\N	f	f	2
58	1	67	2	2018-01-12 15:09:01.289737	\N	f	f	3
59	1	67	23	2018-01-12 15:11:16.435873	\N	f	f	4
60	1	67	23	2018-01-12 15:12:34.513146	\N	f	f	5
61	1	67	23	2018-01-12 15:13:30.92958	\N	f	f	6
62	1	67	23	2018-01-12 15:14:20.273432	\N	f	f	Test
63	1	67	23	2018-01-12 15:14:53.174004	\N	f	f	Test
64	1	67	23	2018-01-12 15:15:15.133221	\N	f	f	Test
65	1	67	23	2018-01-12 15:16:26.908098	\N	f	f	Test
84	1	67	23	2018-01-12 16:23:16.914234	\N	f	f	 wärmer
85	1	67	23	2018-01-12 16:24:26.812914	\N	f	f	heiß???
86	1	67	23	2018-01-12 16:26:16.56468	\N	f	f	heiß???
87	1	67	23	2018-01-12 16:28:03.780068	\N	f	f	heiß???
88	1	67	23	2018-01-12 16:28:51.022092	\N	f	f	heiß???
89	1	67	23	2018-01-12 16:29:17.670228	\N	f	f	heiß?
90	1	67	23	2018-01-12 16:30:41.831353	\N	f	f	heißer
91	1	67	23	2018-01-12 16:35:09.452597	\N	f	f	heißer!
92	1	67	23	2018-01-12 16:35:38.114493	\N	f	f	heißer!
93	1	67	23	2018-01-12 16:38:12.352007	\N	f	f	heißer!
94	1	67	23	2018-01-12 16:40:04.79429	\N	f	f	Ich geb auf
95	1	67	23	2018-01-14 15:17:48.004794	\N	f	f	Neuer Tag, neues Glück
96	1	67	23	2018-01-14 15:27:03.647833	\N	f	f	Neuer Tag, neuer Versuch
97	1	67	23	2018-01-14 15:35:27.235389	\N	f	f	Ein Schritt weiter
98	1	67	23	2018-01-14 15:47:14.84628	\N	f	f	Noch ein Schritt?
99	1	67	23	2018-01-14 15:48:04.366049	\N	f	f	Noch ein Schritt?
100	1	67	23	2018-01-14 15:49:24.425311	\N	f	f	Test?
101	1	67	23	2018-01-14 15:51:29.216747	\N	f	f	Test?
102	1	67	23	2018-01-14 15:52:32.175566	\N	f	f	Test!
103	1	67	23	2018-01-14 15:54:36.301377	\N	f	f	Hallo!
104	1	67	23	2018-01-14 15:55:32.898776	\N	f	f	Hallo!
105	1	72	20	2018-01-14 15:58:56.636344	\N	f	f	Hallo!
106	1	72	20	2018-01-14 15:59:48.014344	\N	f	f	Wie gehts?!
107	1	72	20	2018-01-14 16:02:47.299899	\N	f	f	Wie gehts dir?!
108	1	72	20	2018-01-14 16:04:30.342915	\N	f	f	Willkommen zurück im Kaninchenbau
109	1	72	20	2018-01-14 16:06:07.595675	\N	f	f	Weiter gehts
110	1	72	20	2018-01-14 16:10:31.128418	\N	f	f	Wieder ein Schritt nach vorne
111	1	72	20	2018-01-14 16:12:57.739692	\N	f	f	Es ist nicht wirklich klarer
112	1	72	20	2018-01-14 16:15:38.214644	\N	f	f	Neuer Fehler?
113	1	72	20	2018-01-14 16:17:18.161285	\N	f	f	weiter?
114	1	72	20	2018-01-14 16:19:05.081241	\N	f	f	Strange shit!
115	1	72	20	2018-01-14 16:22:12.179995	\N	f	f	Wird klarer!
116	1	72	20	2018-01-14 16:22:27.471061	\N	f	f	Klappt!
117	1	72	20	2018-01-14 16:35:16.504619	\N	f	f	Klappt nicht!
118	1	72	20	2018-01-14 16:56:03.487752	\N	f	f	Funktioniere!
119	1	72	20	2018-01-15 10:33:15.072554	\N	f	f	Und wieder von vorne!
120	1	72	20	2018-01-15 10:34:02.094193	\N	f	f	NOchmal!
121	1	72	20	2018-01-15 10:52:34.331728	\N	f	f	Neuer Test!
122	1	72	20	2018-01-15 10:53:49.61549	\N	f	f	Neuer Test!2
123	1	72	20	2018-01-15 10:54:52.534	\N	f	f	Neuer Test!3
124	1	72	20	2018-01-15 10:56:02.227569	\N	f	f	Neuer Test!4
125	1	72	20	2018-01-15 10:57:51.465069	\N	f	f	Neuer Test!5
126	1	72	20	2018-01-15 10:59:29.980884	\N	f	f	Neuer Test!6
127	1	72	20	2018-01-15 11:02:25.466293	\N	f	f	Neuer Test!7
128	1	72	20	2018-01-15 11:06:30.277008	\N	f	f	Neuer Test!8
129	1	72	20	2018-01-15 11:07:18.816956	\N	f	f	Neuer Test!9
130	1	72	20	2018-01-15 11:08:08.658368	\N	f	f	Neuer Test!10
131	1	72	20	2018-01-15 11:08:59.243528	\N	f	f	Neuer Test!11
132	1	72	20	2018-01-15 11:18:34.111147	\N	f	f	Neuer Test!12
133	1	72	20	2018-01-15 11:20:00.952437	\N	f	f	Neuer Test!13
134	1	72	20	2018-01-15 11:21:04.895094	\N	f	f	Neuer Test!14
135	1	72	20	2018-01-15 11:22:09.708698	\N	f	f	Neuer Test!15
136	1	72	20	2018-01-15 11:26:07.892168	\N	f	f	Triumph?
137	1	72	20	2018-01-15 11:29:12.380259	\N	f	f	Eher nicht?
138	1	72	20	2018-01-15 11:37:49.086031	\N	f	f	Neuer Test!16
139	1	72	20	2018-01-15 11:39:59.600657	\N	f	f	Neuer Test!17
140	1	72	20	2018-01-15 11:40:47.61882	\N	f	f	Neuer Test!18
141	1	72	20	2018-01-15 11:41:56.326485	\N	f	f	Neuer Test!19
142	1	72	20	2018-01-15 11:43:06.144518	\N	f	f	Neuer Test!20
143	1	72	20	2018-01-15 11:45:02.615232	\N	f	f	Neuer Test!21
144	1	72	20	2018-01-15 11:46:10.281033	\N	f	f	Neuer Test!22
145	1	72	20	2018-01-15 11:46:30.213999	\N	f	f	Neuer Test!23
146	1	72	20	2018-01-15 11:47:06.755046	\N	f	f	Neuer Test!24
147	1	72	20	2018-01-15 11:47:28.703277	\N	f	f	Neuer Test!25
148	1	72	20	2018-01-15 11:48:08.212964	\N	f	f	Neuer Test!26
149	1	72	20	2018-01-15 11:50:15.065792	\N	f	f	Neuer Test!26
150	1	72	20	2018-01-15 11:51:20.339133	\N	f	f	Neuer Test!27
151	1	72	20	2018-01-15 11:53:36.095714	\N	f	f	Neuer Test!28
152	1	72	20	2018-01-15 11:55:45.029161	\N	f	f	Neuer Test!29
153	1	72	20	2018-01-15 12:11:43.183051	\N	f	f	Mal schauen...
154	1	72	20	2018-01-15 12:12:46.867221	\N	f	f	Kein Fehler mehr :-)
155	1	72	20	2018-01-15 12:14:56.741541	\N	f	f	Und weiter
156	1	72	20	2018-01-15 12:17:07.495676	\N	f	f	Und weiter gehts
157	1	72	20	2018-01-15 12:18:35.640875	\N	f	f	Und weiter gehts jetzt
158	1	72	20	2018-01-15 12:20:20.747337	\N	f	f	Und weiter gehts jetzt mal wieder
159	1	72	20	2018-01-15 12:22:31.152493	\N	f	f	Ein Schritt weiter
160	1	72	20	2018-01-15 12:23:04.102434	\N	f	f	Ein Schritt weiter oder nicht
161	1	72	20	2018-01-15 12:31:01.414943	\N	f	f	Ich nähere mich dem Ziel
162	1	72	20	2018-01-15 12:34:49.105772	\N	f	f	Warum zweimal?
163	1	72	20	2018-01-15 12:39:56.166237	\N	f	f	Neuer Versuch!
164	1	72	20	2018-01-15 12:44:31.888347	\N	f	f	Interessante Dinge passieren hier!
165	1	72	20	2018-01-15 12:45:11.834823	\N	f	f	Sehr interessante sogar!
166	1	72	20	2018-01-15 12:47:14.44461	\N	f	f	Ich bin gleich wieder verwirrt!
167	1	72	20	2018-01-15 12:49:57.892665	\N	f	f	Und weiter spielen!
168	1	72	20	2018-01-15 12:52:11.990415	\N	f	f	Und weiter spielen und weiter!
169	1	72	20	2018-01-15 12:53:27.320865	\N	f	f	Bald geht gar nichts mehr!
170	1	72	20	2018-01-15 12:57:44.366466	\N	f	f	Und weiter am rumdoktoren!
171	1	72	20	2018-01-15 13:00:23.365489	\N	f	f	Und weiter am rumdoktoren!
172	1	72	20	2018-01-15 13:00:59.064405	\N	f	f	Und weiter am rumdoktoren!
173	1	72	20	2018-01-15 13:05:27.313202	\N	f	f	Und weiter am rumdoktoren!
174	1	72	20	2018-01-15 13:08:52.578499	\N	f	f	Und weiter am rumdoktoren!
175	1	72	20	2018-01-15 13:11:01.445508	\N	f	f	Und weiter am rumdoktoren!
176	1	72	20	2018-01-15 13:11:58.431754	\N	f	f	Neuer neuer neuer Versuch!
177	1	72	20	2018-01-15 13:14:13.51728	\N	f	f	Fehlt vielleicht was!
178	1	72	20	2018-01-15 13:17:02.604667	\N	f	f	Gefunden?!
179	1	72	20	2018-01-15 13:19:11.444375	\N	f	f	Fehler übert Fehler?!
180	1	72	20	2018-01-15 13:20:00.677435	\N	f	f	Bla Bla Bla?!
181	1	72	20	2018-01-15 13:20:43.233275	\N	f	f	Es funktioniert?!
182	1	72	20	2018-01-15 13:21:46.641903	\N	f	f	Es funktioniert tatsächlich?!
183	1	72	20	2018-01-15 13:22:03.659956	\N	f	f	Doppelt?!
184	1	72	20	2018-01-15 13:27:47.598924	\N	f	f	Warum Doppelt?!
185	1	72	20	2018-01-15 13:28:24.537105	\N	f	f	Nicht mehr?!
186	1	72	20	2018-01-15 13:28:53.208222	\N	f	f	Wieder?
187	1	72	20	2018-01-15 13:31:51.672083	\N	f	f	Es klappt, aber warum doppelt?
188	1	72	20	2018-01-15 13:37:57.794345	\N	f	f	Was neues ausprobiert!
189	1	72	20	2018-01-15 13:40:06.388346	\N	f	f	Weiter gehts!
190	1	72	20	2018-01-15 13:42:57.490097	\N	f	f	Doublette?!
191	1	72	20	2018-01-15 13:47:25.786632	\N	f	f	Booyah!
192	1	72	20	2018-01-15 13:48:18.184275	\N	f	f	Booyah2!
193	1	72	20	2018-01-15 13:48:51.010398	\N	f	f	Es klappt!
194	1	72	20	2018-01-15 13:49:51.540384	\N	f	f	Kleiner gemacht!
195	1	72	20	2018-01-15 15:51:39.771868	\N	f	f	Geht noch alles?
196	1	72	20	2018-01-15 15:52:44.954328	\N	f	f	Geht noch alles?
197	1	72	20	2018-01-15 15:53:00.702187	\N	f	f	Geht noch alles?
198	1	72	20	2018-01-15 15:53:27.229318	\N	f	f	Geht noch alles?
199	1	72	20	2018-01-15 15:54:22.595712	\N	f	f	Weiter
200	1	72	20	2018-01-15 15:54:59.609346	\N	f	f	Test
201	1	72	20	2018-01-15 15:57:13.522293	\N	f	f	Nummer 200
202	1	72	20	2018-01-15 15:59:23.231514	\N	f	f	Kommando zurück
203	1	72	20	2018-01-15 16:01:10.508082	\N	f	f	Was hab ich jetzt wieder falsch gemacht
204	1	72	20	2018-01-15 16:02:25.437298	\N	f	f	test1
205	1	72	20	2018-01-15 16:03:22.532563	\N	f	f	test2
206	1	74	34	2018-01-15 16:07:28.172031	\N	f	f	Noch ganz jungfräulich hier
207	1	74	34	2018-01-15 16:45:11.549947	\N	f	f	Aber nicht mehr lange ;-)
208	1	74	34	2018-01-15 16:49:27.482034	\N	f	f	Klappt noch?
209	1	74	34	2018-01-15 16:56:51.867488	\N	f	f	Neuer Test
210	1	74	34	2018-01-15 16:58:32.622261	\N	f	f	Weiter
211	1	74	34	2018-01-15 16:58:56.851524	\N	f	f	Weiter gehts
212	1	2	1	2018-01-20 11:18:55.415219	\N	f	f	Pariatur quia quia alias repellendus tenetur enim corrupti et.
213	1	2	1	2018-01-20 11:25:50.088658	\N	f	f	Et eaque sunt.
214	1	2	1	2018-01-20 11:26:44.700439	\N	f	f	Et nesciunt tenetur et nulla cumque ut.
215	1	2	1	2018-01-20 11:27:48.854216	\N	f	f	Excepturi et ut eveniet omnis.
216	1	2	1	2018-01-20 11:28:57.442573	\N	f	f	Consequatur eos porro libero ut.
217	1	2	1	2018-01-20 11:29:33.330149	\N	f	f	Occaecati omnis voluptas.
218	1	2	1	2018-01-20 11:30:30.68426	\N	f	f	Sint expedita veniam non adipisci et.
219	1	2	1	2018-01-20 11:34:39.328081	\N	f	f	Quas nobis soluta.
220	1	2	1	2018-01-20 11:36:43.353598	\N	f	f	Laborum ducimus tempora rerum.
221	1	2	1	2018-01-20 11:40:46.417879	\N	f	f	Nobis velit non eum quam.
222	1	2	1	2018-01-20 11:46:18.136789	\N	f	f	Sapiente esse consectetur nisi laboriosam qui architecto quos qui qui.
223	1	67	34	2018-01-25 18:04:28.933595	\N	f	f	Can you hear me?
224	1	67	34	2018-01-25 18:06:07.073051	\N	f	f	Can you hear me now?
225	1	67	34	2018-01-26 10:43:05.289179	\N	f	f	Does Auth work?
226	1	67	34	2018-01-26 10:47:33.656416	\N	f	f	Does Auth work?
227	1	67	34	2018-01-26 10:47:59.372254	\N	f	f	Does Auth work?
228	1	67	34	2018-01-26 10:49:34.656727	\N	f	f	Does Auth work now?
229	1	67	17	2018-01-26 10:51:44.063907	\N	f	f	I hope now?
230	1	67	17	2018-01-26 10:51:58.246443	\N	f	f	I hope now?
231	1	67	17	2018-01-26 10:52:44.378769	\N	f	f	I hope now!
232	1	74	17	2018-01-26 11:30:25.450726	\N	f	f	I hope now!
233	1	74	17	2018-01-26 11:43:34.503811	\N	f	f	I hope now!
234	1	74	17	2018-01-26 11:53:56.006816	\N	f	f	I hope now!
235	1	74	17	2018-01-26 11:58:37.742948	\N	f	f	Strange things happening!
236	1	74	17	2018-01-26 11:58:55.211712	\N	f	f	Strange things happening!
237	1	74	17	2018-01-26 12:01:09.064081	\N	f	f	Strange things happening!
238	1	74	17	2018-01-26 12:02:25.636158	\N	f	f	Stranger things happening!
239	1	74	17	2018-01-26 12:03:30.429854	\N	f	f	Why!
240	1	74	17	2018-01-26 12:04:22.037959	\N	f	f	Why!
241	1	74	17	2018-01-26 12:04:36.620621	\N	f	f	Why!
242	1	74	17	2018-01-26 12:04:44.816329	\N	f	f	Why!1
243	1	74	17	2018-01-26 12:22:04.901943	\N	f	f	Why!12
244	1	74	17	2018-01-26 12:31:59.991655	\N	f	f	Why!12
245	1	74	17	2018-01-26 12:34:09.143307	\N	f	f	Dummer Fehler
246	1	74	17	2018-01-26 12:35:52.538281	\N	f	f	Dummer Fehler
247	1	74	17	2018-01-26 12:38:19.350155	\N	f	f	Shots fired!
248	1	74	17	2018-01-26 12:42:51.987496	\N	f	f	More Shots fired!
249	1	74	17	2018-01-26 12:46:44.17452	\N	f	f	More Shots fired!
250	1	74	17	2018-01-26 12:48:19.73277	\N	f	f	Even More Shots fired!
251	1	74	17	2018-01-26 12:49:31.255496	\N	f	f	Even More Shots fired!
252	1	74	17	2018-01-26 12:49:49.037778	\N	f	f	Even More Shots fired!
253	1	74	17	2018-01-26 12:49:59.641649	\N	f	f	Even More Shots fired 2!
254	1	74	17	2018-01-26 12:53:13.778868	\N	f	f	Even More Shots fired 2!
255	1	74	17	2018-01-26 12:56:31.418775	\N	f	f	Even More Shots fired 2!
256	1	74	17	2018-01-26 12:59:44.01095	\N	f	f	Even More Shots fired 3!
257	1	74	17	2018-01-26 13:04:14.234197	\N	f	f	Even More Shots fired 4!
258	1	74	17	2018-01-26 13:05:01.155816	\N	f	f	Even More Shots fired 4!
259	1	74	17	2018-01-26 13:08:41.670147	\N	f	f	Even More Shots fired 5!
260	1	74	17	2018-01-26 13:16:03.389903	\N	f	f	Even More Shots fired 5!
261	1	74	17	2018-01-26 13:18:23.377453	\N	f	f	Even More Shots fired 6!
262	1	74	17	2018-01-26 13:19:27.337074	\N	f	f	Even More Shots fired 6!
263	1	74	17	2018-01-26 13:34:09.53986	\N	f	f	Even More Shots fired 7!
264	1	74	17	2018-01-26 13:35:27.763206	\N	f	f	Even More Shots fired 7!
265	1	74	17	2018-01-26 13:36:03.089839	\N	f	f	 7!
266	1	74	17	2018-01-26 13:37:43.894972	\N	f	f	 7!
267	1	74	17	2018-01-26 13:38:20.687071	\N	f	f	 7!
268	1	74	17	2018-01-26 13:39:57.628259	\N	f	f	 7!
269	1	74	17	2018-01-26 13:40:49.529754	\N	f	f	Klappt!
270	1	74	17	2018-01-26 13:42:41.920857	\N	f	f	Klappt!
271	1	74	17	2018-01-26 13:47:29.716013	\N	f	f	Endlich!
272	1	74	17	2018-01-26 13:47:39.770229	\N	f	f	Endlich!
273	1	74	17	2018-01-26 13:48:36.703653	\N	f	f	Endlich!
274	1	74	17	2018-01-26 13:48:49.579598	\N	f	f	Endlich funzt alles wie es soll!
275	1	74	17	2018-01-26 13:51:37.44789	\N	f	f	Gott sei dank!
276	1	74	61	2018-01-26 16:18:50.392965	\N	f	f	SCHEISS CORS!
277	1	61	74	2018-01-26 16:19:48.6239	\N	f	f	SCHEISS CORS!
278	1	61	72	2018-01-26 16:20:37.102997	\N	f	f	CORS!
279	1	74	61	2018-01-26 16:21:31.503484	\N	f	f	SCHEISS CORS2!
280	1	74	61	2018-01-26 16:26:20.412127	\N	f	f	Test!
281	1	61	73	2018-01-26 16:26:35.749159	\N	f	f	Test!
282	1	61	73	2018-01-26 16:28:03.498214	\N	f	f	Test16!
283	1	61	73	2018-01-26 16:28:37.06962	\N	f	f	Test17!
284	1	73	12	2018-01-27 11:30:34.62231	\N	f	f	Hi dude!
285	1	74	12	2018-01-27 11:30:49.725422	\N	f	f	Hi dude!
286	1	61	62	2018-02-01 18:05:28.791798	\N	f	f	TestMessage
287	1	61	60	2018-02-01 22:09:39.732496	\N	f	f	Test
288	1	2	61	2018-02-01 22:09:55.314144	\N	f	f	Test von Nils
289	1	2	61	2018-02-01 22:16:03.75274	\N	f	f	dfa
290	1	3	61	2018-02-01 22:22:04.671912	\N	f	f	Tesg
291	1	3	61	2018-02-01 22:22:16.721459	\N	f	f	Tesg
292	1	4	61	2018-02-01 22:28:44.081114	\N	f	f	Testmessage
293	1	3	61	2018-02-01 22:29:20.685286	\N	f	f	fdg
294	1	5	61	2018-02-01 22:30:06.408455	\N	f	f	Testmessage
295	1	3	61	2018-02-01 22:32:14.105474	\N	f	f	Test
296	1	3	61	2018-02-01 22:32:59.753145	\N	f	f	Test
297	1	3	61	2018-02-01 23:03:40.624656	\N	f	f	safsafasdsagsd
298	1	2	61	2018-02-01 23:19:15.118661	\N	f	f	dfaghs
299	1	67	61	2018-02-01 23:24:33.725384	\N	f	f	Hi,\n\ndas Interface dürfte Funktionieren.\n\nGruß\nNils
300	1	67	61	2018-02-01 23:25:42.541597	\N	f	f	Nochmal zum Test ;)
301	1	67	61	2018-02-01 23:34:12.198875	\N	f	f	Timeout
302	1	3	61	2018-02-01 23:35:36.397858	\N	f	f	test
303	1	3	61	2018-02-01 23:36:27.400153	\N	f	f	Test
304	1	67	61	2018-02-02 13:59:20.635468	\N	f	f	Hi wie geht es?\n\nGruß\nNils
305	1	74	67	2018-02-03 11:23:08.989292	\N	f	f	Neuer Test
306	1	74	67	2018-02-03 11:26:50.306747	\N	f	f	Neuer Test
307	1	74	67	2018-02-03 11:27:20.733681	\N	f	f	Neuer Test
308	1	74	67	2018-02-03 11:34:41.569145	\N	f	f	Neuer Test
309	1	74	67	2018-02-03 12:07:02.358852	\N	f	f	Neuer32rasdefaewstq34traewsfasw
310	1	74	67	2018-02-03 12:09:42.62024	\N	f	f	Neuer32rasdefaewstq34traewsfasw
311	1	74	67	2018-02-03 12:10:28.462861	\N	f	f	Neuer32rasdefaewstq34traewsfasw
312	1	74	67	2018-02-03 12:10:48.625876	\N	f	f	Neuer32rasdefaewstq34traewsfasw
313	1	74	67	2018-02-03 12:11:59.274175	\N	f	f	Neuer32rasdefaewstq34traewsfasw
314	1	74	67	2018-02-03 12:12:55.425861	\N	f	f	Neuer32rasdefaewstq34traewsfasw
315	1	74	67	2018-02-03 12:13:05.637522	\N	f	f	Neuer32rasdefaewstq34traewsfasw
316	1	74	67	2018-02-03 12:14:38.031458	\N	f	f	Neuer32rasdefaewstq34traewsfasw
317	1	74	67	2018-02-03 12:16:06.166626	\N	f	f	Neuer32rasdefaewstq34traewsfasw
318	1	74	67	2018-02-03 12:16:50.06287	\N	f	f	Neuer32rasdefaewstq34traewsfasw
319	1	74	67	2018-02-03 12:18:09.17917	\N	f	f	Es geht wieder!!!
320	1	74	67	2018-02-03 12:18:49.162596	\N	f	f	Es geht weiter!!!
321	1	74	67	2018-02-03 15:21:02.099672	\N	f	f	Alles kaputt?
322	1	74	67	2018-02-03 15:54:07.141156	\N	f	f	Es geht weiter!!!
323	1	74	67	2018-02-03 15:54:20.846462	\N	f	f	Denn es klappt!!!
324	1	74	67	2018-02-03 15:57:16.998846	\N	f	f	Denn es klappt immer noch!!!
325	1	74	67	2018-02-03 16:12:17.095775	\N	f	f	Denn es klappt immer noch nicht richtig!!!
326	1	74	67	2018-02-03 16:19:54.136657	\N	f	f	Argh!!!
327	1	37	67	2018-02-04 16:07:04.98108	\N	f	f	Enim doloribus est.
6	1	8	6	2017-12-28 22:26:58.492319	2018-02-04 16:07:05.252	f	f	
328	1	20	67	2018-02-04 16:07:05.391702	2018-02-04 16:07:05.456	t	f	Quibusdam in cum occaecati dolore.
329	1	67	74	2018-02-06 10:04:22.164557	\N	f	f	Test Test Test!!!
330	1	67	74	2018-02-06 10:06:56.296269	\N	f	f	Test Test Test!!!
331	1	68	74	2018-02-06 10:07:06.90527	\N	f	f	Test Test Test!!!
332	1	70	74	2018-02-06 10:07:26.773149	\N	f	f	Test Test Test!!!
333	1	67	74	2018-02-06 10:08:48.250461	\N	f	f	Test Test Test!!!
334	1	67	74	2018-02-06 10:10:00.155028	\N	f	f	Test Test Test!!!
335	1	67	74	2018-02-06 10:10:24.514472	\N	f	f	Klappt es jetzt?!!!
336	1	67	74	2018-02-06 10:19:42.747785	\N	f	f	Klappt es jetzt?!!!
337	1	67	74	2018-02-06 10:31:41.662483	\N	f	f	Es funzt?!!!
338	1	2	67	2018-02-06 10:40:36.814073	\N	f	f	asdas
339	1	3	67	2018-02-06 12:53:28.433061	\N	f	f	Hello
340	1	61	67	2018-02-09 14:50:22.372605	\N	f	f	Wir müssen das Frontend fertig bauen.
341	1	61	67	2018-02-09 14:50:39.93993	\N	f	f	Aber das ist noch soviel nervige Arbeit :(\n
\.


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 341, true);


--
-- Data for Name: parentunit_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.parentunit_data (parentunit, childunit) FROM stdin;
25	7
25	22
25	31
25	67
21	25
21	71
21	22
14	21
\.


--
-- Data for Name: phone_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.phone_data (unitid, number, verified, autogenerated, description, priority, tag) FROM stdin;
\.


--
-- Data for Name: plan_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plan_data (id, name, appid, teaserdescription, features, startdate, enddate, numlicences, price, currency, options, payperiod, cancelperiod, gotoplan, optional, mainplan, gototime) FROM stdin;
2	Basic Weebly	2	Basic Plan for Weebly	\N	2018-03-06 14:30:50.42971	\N	1	10.00	USD	\N	\N	\N	\N	f	\N	\N
19	Options A	3	Option option sha lala	\N	2018-05-28 00:00:00	\N	5	23.32	EUR	\N	00:00:01	00:00:02	\N	t	18	\N
5	Moo Basic	6	Basic Plan for Moo	\N	2018-04-21 09:43:59.347799	2018-05-06 00:00:00	1	10.00	USD	\N	1 year	\N	\N	f	\N	\N
3	Admins	4	How many Admins do you need?	{}	2018-04-18 14:23:53.907899	\N	1	2.00	USD	{"type": "counter"}	\N	\N	\N	t	1	\N
4	Basic Pipedrive	4	An advanced plan for pipedrive	\N	2018-04-21 08:42:22.07053	\N	5	15.00	USD	\N	1 year	\N	\N	f	1	\N
7	Basic Pipedrive	4	\N	\N	2018-05-04 10:43:16.962856	\N	1	4.50	USD	\N	1 year	\N	\N	f	1	\N
8	Pipedrive Plus	4	More than Pipedrive Basic	[{"name": " ", "subfeatures": [{"name": "Yes"}, {"name": "Partly", "subfeatures": [{"name": "Yes"}]}]}, {"name": "24/7"}]	2018-05-04 10:47:03.963842	\N	1	200.00	USD	\N	1 year	\N	\N	f	\N	\N
6	Pipedrive Pro	4	\N	\N	2018-05-03 14:36:12.946809	\N	1	10.00	USD	{"type": "checkbox"}	1 year	\N	\N	t	1	\N
1	Basic Pipedrive	4	Basic Plan for Pipedrive	[{"name": " ", "subfeatures": [{"name": "Yes"}, {"name": "Partly", "subfeatures": [{"name": "Yes"}]}]}, {"name": "24/7"}]	2018-03-01 18:49:25.903196	\N	2	5.00	USD	{"addoptions": [{"name": "SSL-Security", "preselect": true, "monthlyPrice": 10}], "addUserMonthly": 5, "monthlyUserPrice": 20}	1 year	\N	\N	f	\N	\N
9	Slack Basic	3	\N	\N	2018-05-24 00:00:00	2018-06-07 00:00:00	12	12.32	USD	\N	00:00:01	\N	\N	f	\N	\N
10	\N	\N	\N	\N	2018-05-05 12:41:19.25348	\N	1	\N	USD	\N	\N	\N	\N	f	\N	\N
11	\N	\N	\N	\N	2018-05-05 12:42:07.846154	\N	1	\N	USD	\N	\N	\N	\N	f	\N	\N
12	\N	\N	\N	\N	2018-05-05 12:42:35.91866	\N	1	\N	USD	\N	\N	\N	\N	f	\N	\N
13	Google Apps Basic	5	The basic plan for a subscription to Google Apps	\N	2018-05-02 00:00:00	2018-12-04 23:00:00	5	9.99	USD	\N	00:00:01	00:00:02	\N	f	\N	\N
14	Pro Weebly	2	The pro version of Weebly with way more features	\N	2018-05-15 00:00:00	\N	20	19.99	USD	\N	00:00:01	00:00:02	\N	f	\N	\N
15	Basic Weebly Sub 1	2	A new basic plan for Weebly. Great for starters	\N	2018-05-24 00:00:00	\N	10	9.99	USD	\N	00:00:03	00:00:01	\N	f	2	\N
16	Super Basic Weebly	2	Lorem ipsum nils nils nils	\N	2018-05-10 00:00:00	2018-11-27 23:00:00	15	5.99	USD	\N	00:00:01	00:00:02	\N	f	\N	\N
17	Option B	2	The Option B for super basic Weebly 	\N	2018-05-09 00:00:00	\N	5	3.19	YEN	\N	00:00:02	\N	\N	f	16	\N
18	Slack Pro	3	The pro version of Slack	\N	2018-05-03 00:00:00	\N	20	19.99	EUR	\N	00:00:01	00:00:02	\N	f	\N	\N
\.


--
-- Name: plan_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.plan_data_id_seq', 19, true);


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.plans (id, appid, description, renewalplan, period, numlicences, price, currency, name, activefrom, activeuntil, promo, promovipfy, promodeveloper, promoname, changeafter, changeplan) FROM stdin;
3	2	\N	\N	1	5	40.00	USD	Group	\N	\N	\N	\N	\N	\N	\N	\N
4	2	One year for you	\N	12	1	120.00	USD	Individual	\N	\N	\N	\N	\N	\N	\N	\N
5	2	One year for your company	\N	12	5	500.00	USD	Group Year	\N	\N	\N	\N	\N	\N	\N	\N
8	11	special	\N	1	1	11.00	USD	test	\N	\N	\N	\N	\N	\N	\N	\N
1	3	<ul><li>Websitebuilder</li><li>One User</li><li>Standard Support</li><ul>	\N	1	1	10.00	USD	Standard	\N	\N	\N	\N	\N	\N	\N	\N
2	3	<ul><li>Websitebuilder</li><li>Five Users</li><li>Standard Support</li><ul>	\N	1	5	30.00	USD	Group	\N	\N	\N	\N	\N	\N	\N	\N
9	1	special	\N	1	1	20.00	USD	Weebly	\N	\N	\N	\N	\N	\N	\N	\N
10	1	\N	\N	1	1	30.00	USD	Weebly	\N	\N	\N	\N	\N	\N	\N	\N
11	1	\N	\N	1	1	40.00	USD	Weebly	\N	\N	\N	\N	\N	\N	\N	\N
12	2	\N	\N	1	1	50.00	USD	Weebly	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Name: plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.plans_id_seq', 12, true);


--
-- Data for Name: promo_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.promo_data (id, name, planid, startdate, enddate, restrictions, description, sponsor, discount) FROM stdin;
\.


--
-- Name: promo_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.promo_data_id_seq', 1, false);


--
-- Data for Name: review_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.review_data (unitid, appid, reviewdate, stars, reviewtext, id, answerto) FROM stdin;
22	2	2018-02-26 18:22:16.014763	3	Test Text	16	\N
7	2	2018-02-27 14:38:14.149633	4	2. Test 4 stars	18	\N
22	2	2018-03-01 16:19:33.218859	3	Test	19	\N
22	2	2018-03-01 16:24:04.558905	3	Test	20	\N
7	2	2018-03-01 16:24:59.276328	4	Great App!	21	\N
7	2	2018-03-01 16:25:55.865715	4	Another Great App!	22	\N
7	2	2018-03-01 16:26:59.1961	4	And Another Great App!	23	\N
22	2	2018-03-01 16:42:10.158104	5	Great app by me :D	24	\N
22	2	2018-03-01 16:47:46.259557	5	Test App Revuew	25	\N
22	2	2018-03-01 16:49:21.620996	5	Test me	26	\N
22	2	2018-03-02 02:31:33.404934	4	Test the new interface. Hopefully it works :D	27	\N
22	2	2018-03-02 02:37:39.834698	3	Bla	28	\N
22	2	2018-03-02 02:40:30.14068	3	Test	29	\N
22	2	2018-03-02 02:44:49.256246	4	Hopefully last function test	30	\N
7	4	2018-03-03 12:11:29.705012	5	Pipedrive is a great App\n	31	\N
7	4	2018-03-03 12:25:59.995327	5	It is still great	32	\N
22	2	2018-03-07 14:44:23.2038	4	Test Review	33	\N
22	2	2018-03-07 14:50:50.814725	3	Test no refetch	34	\N
7	2	2018-03-08 20:49:29.242898	5	Prettier ist toll!	35	\N
22	11	2018-04-03 11:10:45.195317	3	Okay App - shitty company	36	\N
7	4	2018-04-04 19:06:26.485507	2	Not as good as it once was	37	\N
22	4	2018-04-05 22:21:57.223	4	Pipedrive Review	38	\N
22	4	2018-04-05 22:24:25.928	3	Review Pipedrive	39	\N
22	4	2018-05-09 12:42:44.61789	1	Halb	40	\N
\.


--
-- Data for Name: reviewhelpful; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reviewhelpful (helpfuldate, comment, balance, reviewid, unitid) FROM stdin;
\.


--
-- Data for Name: reviewhelpful_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reviewhelpful_data (reviewid, unitid, helpfuldate, comment, balance) FROM stdin;
\.


--
-- Name: reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.reviews_id_seq', 40, true);


--
-- Data for Name: right_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.right_data (holder, forunit, type) FROM stdin;
22	\N	admin
22	22	buyapps
7	14	admin
\.


--
-- Data for Name: speaks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.speaks (userid, language, preferred) FROM stdin;
\.


--
-- Data for Name: unit_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.unit_data (id, payingoptions, banned, deleted, suspended, profilepicture, riskvalue, createdate, "position") FROM stdin;
70	\N	f	t	f		\N	2018-04-22 12:05:34.045	\N
71	\N	f	t	f		\N	2018-04-22 12:06:00.375	\N
31	\N	f	f	f	\N	\N	2018-04-13 13:41:18.542	CEO
22	{"cardtype": "visa"}	f	f	f	\N	\N	2018-02-26 17:19:25.795	CMO
12	\N	f	f	f	\N	\N	\N	Weebly
13	\N	f	f	f	\N	\N	\N	Slack
15	\N	f	f	f	\N	\N	\N	Google Apps
16	\N	f	f	f	\N	\N	\N	Moo
17	\N	f	f	f	\N	\N	\N	Vistaprint
18	\N	f	f	f	\N	\N	\N	CakeHr
19	\N	f	f	f	\N	\N	\N	Waveapps
20	\N	f	f	f	\N	\N	\N	Xero
21	\N	f	f	f	\N	\N	\N	DD24
14	{"cardtype": "visa"}	f	f	f	https://storage.googleapis.com/vipfy-imagestore-01/vipfy-logo.png	\N	\N	Pipedrive
25	\N	f	f	f	logo_white	\N	2018-04-05 11:06:28.487283	\N
67	\N	f	f	f	\N	\N	2018-04-18 18:58:53.253	CTO
7	\N	f	f	f	Pascal_q.jpg	\N	2018-02-20 11:19:34.034	COO
72	\N	f	f	f	\N	\N	2018-04-25 08:41:49.382	\N
\.


--
-- Name: unit_data_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.unit_data_id_seq', 72, true);


--
-- Data for Name: usedcompanyplans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usedcompanyplans (userid, appid, planid, companyid, planbought, key, usedfrom, usedto) FROM stdin;
\.


--
-- Data for Name: userbills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.userbills (userid, date, billpos, textpos, price, currency, appid, planid, orgcurrency, exchangerate) FROM stdin;
5	2017-12-30 15:17:01.598623	1	Eine Position	11.20	USD	2	1	EUR	1.0300000000
\.


--
-- Data for Name: userrights; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.userrights (userid, companyid, departmentid, userright) FROM stdin;
61	17	12	1
61	19	12	1
\.


--
-- Data for Name: users_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users_data (id, firstname, middlename, lastname, "position", email, password, title, sex, userstatus, birthday, recoveryemail, mobilenumber, telefonnumber, addresscountry, addressstate, addresscity, addressstreet, addressnumber, profilepicture, lastactive, lastsecret, riskvalue, newsletter, referall, cobranded, resetoption, "createdAt", "updatedAt") FROM stdin;
2	Tatum	Arnaldo	Reilly	Lead Applications Director	Velda.Orn@yahoo.com	Producer	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:29:32+00	\N	\N	f	0	0	0	2017-08-10 13:29:32.533+00	2017-08-10 13:29:32.533+00
3	Jamar	Courtney	Pfannerstill	District Factors Administrator	Lawrence_Schuster63@hotmail.com	Pennsylvania	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:29:32+00	\N	\N	f	0	0	0	2017-08-10 13:29:32.534+00	2017-08-10 13:29:32.534+00
4	Vernon	Nicklaus	Larkin	Corporate Response Specialist	Orlo3@yahoo.com	program	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:29:32+00	\N	\N	f	0	0	0	2017-08-10 13:29:32.534+00	2017-08-10 13:29:32.534+00
5	Kristopher	Talia	Klocko	Corporate Functionality Agent	Isabell.Heaney@gmail.com	intuitive	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:29:32+00	\N	\N	f	0	0	0	2017-08-10 13:29:32.535+00	2017-08-10 13:29:32.535+00
6	Cole	Kenny	Stark	Direct Security Supervisor	Lempi_McKenzie84@hotmail.com	Fish	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:29:32+00	\N	\N	f	0	0	0	2017-08-10 13:29:32.536+00	2017-08-10 13:29:32.536+00
7	Ava	Joana	Fisher	Investor Tactics Administrator	Casimer67@gmail.com	Home Loan Account	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:29:32+00	\N	\N	f	0	0	0	2017-08-10 13:29:32.538+00	2017-08-10 13:29:32.538+00
8	Lina	Carol	Kub	Lead Operations Representative	Jessyca4@gmail.com	Louisiana	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:29:32+00	\N	\N	f	0	0	0	2017-08-10 13:29:32.539+00	2017-08-10 13:29:32.539+00
9	Kiel	Sonny	Schoen	Chief Markets Associate	Margie_Anderson@yahoo.com	Implementation	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:29:32+00	\N	\N	f	0	0	0	2017-08-10 13:29:32.538+00	2017-08-10 13:29:32.538+00
10	Joy	Brian	Gerlach	Investor Infrastructure Manager	Mortimer.Konopelski@yahoo.com	asymmetric	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:29:32+00	\N	\N	f	0	0	0	2017-08-10 13:29:32.54+00	2017-08-10 13:29:32.54+00
11	Eden	Laurence	Hackett	Regional Brand Designer	Nigel90@yahoo.com	Handmade Fresh Computer	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:32:13+00	\N	\N	f	0	0	0	2017-08-10 13:32:13.526+00	2017-08-10 13:32:13.526+00
12	Janick	Reid	Halvorson	National Factors Associate	Werner_Jacobs@hotmail.com	Pitcairn Islands	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:32:13+00	\N	\N	f	0	0	0	2017-08-10 13:32:13.528+00	2017-08-10 13:32:13.528+00
13	Quincy	Kimberly	Lowe	Future Metrics Assistant	Nannie_Kling79@hotmail.com	Monitored	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:32:13+00	\N	\N	f	0	0	0	2017-08-10 13:32:13.529+00	2017-08-10 13:32:13.529+00
14	Wiley	Elvie	Cormier	Corporate Metrics Engineer	Maria65@gmail.com	Cotton	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:32:13+00	\N	\N	f	0	0	0	2017-08-10 13:32:13.53+00	2017-08-10 13:32:13.53+00
15	Rylee	Anabel	Mraz	National Factors Designer	Susie.Paucek2@gmail.com	challenge	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:32:13+00	\N	\N	f	0	0	0	2017-08-10 13:32:13.53+00	2017-08-10 13:32:13.53+00
16	Vincenzo	Madaline	Fritsch	Dynamic Division Manager	Therese.Conn63@yahoo.com	Web	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:32:13+00	\N	\N	f	0	0	0	2017-08-10 13:32:13.532+00	2017-08-10 13:32:13.532+00
17	Beau	Dasia	Green	Customer Functionality Developer	Barney.Kohler@hotmail.com	hacking	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:32:13+00	\N	\N	f	0	0	0	2017-08-10 13:32:13.533+00	2017-08-10 13:32:13.533+00
18	Modesto	Luisa	Daniel	Central Tactics Agent	Efrain.Rutherford85@gmail.com	Bedfordshire	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:32:13+00	\N	\N	f	0	0	0	2017-08-10 13:32:13.534+00	2017-08-10 13:32:13.534+00
19	Lola	Ernie	Wiegand	Human Applications Coordinator	Evangeline_Stroman59@yahoo.com	USB	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:32:13+00	\N	\N	f	0	0	0	2017-08-10 13:32:13.534+00	2017-08-10 13:32:13.534+00
20	Niko	Kaylee	Becker	Corporate Identity Consultant	Tristian.Mante29@gmail.com	Gorgeous Concrete Table	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:32:13+00	\N	\N	f	0	0	0	2017-08-10 13:32:13.535+00	2017-08-10 13:32:13.535+00
21	Marshall	Velda	Connelly	Legacy Branding Liaison	Lera.Thompson69@gmail.com	digital	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 14:58:57+00	\N	\N	f	0	0	0	2017-08-10 14:58:57.684+00	2017-08-10 14:58:57.684+00
22	Crystal	Aiyana	Breitenberg	Investor Identity Coordinator	Kelsie35@hotmail.com	Forint	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 14:58:57+00	\N	\N	f	0	0	0	2017-08-10 14:58:57.687+00	2017-08-10 14:58:57.687+00
23	Frederik	Buck	Torphy	Product Infrastructure Facilitator	Joanne36@gmail.com	invoice	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 14:58:57+00	\N	\N	f	0	0	0	2017-08-10 14:58:57.688+00	2017-08-10 14:58:57.688+00
24	Nyasia	Hettie	Pollich	Direct Markets Producer	Simeon.Hermiston84@yahoo.com	Lek	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 14:58:57+00	\N	\N	f	0	0	0	2017-08-10 14:58:57.689+00	2017-08-10 14:58:57.689+00
25	Jarrod	Creola	Yost	International Security Executive	Chanelle20@hotmail.com	salmon	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 14:58:57+00	\N	\N	f	0	0	0	2017-08-10 14:58:57.689+00	2017-08-10 14:58:57.689+00
26	Clovis	Terrill	Rippin	Human Communications Consultant	Liliana14@gmail.com	Light	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 14:58:57+00	\N	\N	f	0	0	0	2017-08-10 14:58:57.691+00	2017-08-10 14:58:57.691+00
27	Gus	Romaine	DuBuque	Principal Markets Officer	Lukas.Cummerata@yahoo.com	payment	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 14:58:57+00	\N	\N	f	0	0	0	2017-08-10 14:58:57.694+00	2017-08-10 14:58:57.694+00
28	Shanny	Josh	Gottlieb	Principal Program Agent	Lavon45@hotmail.com	Designer	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 14:58:57+00	\N	\N	f	0	0	0	2017-08-10 14:58:57.693+00	2017-08-10 14:58:57.693+00
29	Sarah	Kiera	Corkery	Principal Web Executive	Jerad.Koch@yahoo.com	Central	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 14:58:57+00	\N	\N	f	0	0	0	2017-08-10 14:58:57.695+00	2017-08-10 14:58:57.695+00
30	Hosea	Juanita	Lueilwitz	Future Identity Consultant	Georgette_Schuppe8@gmail.com	Synchronised	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 14:58:57+00	\N	\N	f	0	0	0	2017-08-10 14:58:57.696+00	2017-08-10 14:58:57.696+00
31	Conrad	Napoleon	Fay	Customer Optimization Director	Tyson.Okuneva27@gmail.com	Credit Card Account	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 15:00:43+00	\N	\N	f	0	0	0	2017-08-10 15:00:43.182+00	2017-08-10 15:00:43.182+00
32	Dorothea	Krystel	Kuphal	Global Mobility Manager	Angelina.Boehm@hotmail.com	Turkmenistan	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 15:00:43+00	\N	\N	f	0	0	0	2017-08-10 15:00:43.184+00	2017-08-10 15:00:43.184+00
33	Jamar	Alford	Cummings	Human Factors Executive	Makenna_Lakin94@hotmail.com	indexing	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 15:00:43+00	\N	\N	f	0	0	0	2017-08-10 15:00:43.185+00	2017-08-10 15:00:43.185+00
34	Kari	Issac	Kertzmann	Senior Accountability Technician	Allison71@yahoo.com	Trail	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 15:00:43+00	\N	\N	f	0	0	0	2017-08-10 15:00:43.186+00	2017-08-10 15:00:43.186+00
35	Verda	Felipa	Schneider	Regional Data Officer	Rod.Walker39@hotmail.com	Comoro Franc	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 15:00:43+00	\N	\N	f	0	0	0	2017-08-10 15:00:43.187+00	2017-08-10 15:00:43.187+00
36	Evalyn	Vince	Bradtke	Legacy Intranet Facilitator	Ramona34@hotmail.com	sexy	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 15:00:43+00	\N	\N	f	0	0	0	2017-08-10 15:00:43.188+00	2017-08-10 15:00:43.188+00
37	Chance	Augusta	Doyle	Future Directives Engineer	Lysanne97@hotmail.com	Lithuania	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 15:00:43+00	\N	\N	f	0	0	0	2017-08-10 15:00:43.191+00	2017-08-10 15:00:43.191+00
38	Stan	Cletus	Leffler	Dynamic Division Supervisor	Narciso.Kertzmann@gmail.com	Tokelau	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 15:00:43+00	\N	\N	f	0	0	0	2017-08-10 15:00:43.19+00	2017-08-10 15:00:43.19+00
39	Krystel	Minnie	Beatty	Customer Program Producer	Frankie43@hotmail.com	focus group	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 15:00:43+00	\N	\N	f	0	0	0	2017-08-10 15:00:43.192+00	2017-08-10 15:00:43.192+00
40	Domenico	Americo	Corwin	Dynamic Configuration Strategist	Johanna_Towne@yahoo.com	Crossroad	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2017-08-10 15:00:43+00	\N	\N	f	0	0	0	2017-08-10 15:00:43.193+00	2017-08-10 15:00:43.193+00
60	\N	\N	\N	\N		\\xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-08-22 22:14:53.082907+00	2017-08-22 22:14:53.082907+00
61	Nils	\N	Vossebein	\N	nils.vossebein@gmx.de	$2a$12$kdlPZC5NvzmgAs8hewssQ.GFadFQ2oBu6gTz1Jm4mjzD1fcPlOx0K	\N	\N	normal	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-08-22 22:19:21.999659+00	2017-08-22 22:19:21.999659+00
63	\N	\N	\N	\N	mmmhome@gmail.com	\\x854ddc006369eb7bac38bb6690e7f9b05d0d68659be1f96564df407d653e0df2	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-08-23 10:54:08.700911+00	2017-08-23 10:54:08.700911+00
62	\N	\N	\N	\N	nils.vossebein@gmail.com	4af2531c65fb505cfbd0add1e2f31573	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-08-23 10:49:52.912159+00	2017-08-23 10:49:52.912159+00
65	\N	\N	\N	\N	pascal@test.de	$2a$12$w6g68hNrkiPSCuI8WxVAYOSTTM9lyjJF3FvVJFqS1YIZvTesF.ck.	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-11-09 11:10:05.702+00	2017-11-09 11:10:05.702+00
68	\N	\N	\N	\N	neuerTest@test.com	$2a$12$VYW8sO6.fYjZYO2V4o6Bb.i6Abq7Y/XZmkZV1jLuUTXEoAYMFjpaC	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-11-13 14:13:37.649+00	2017-11-13 14:13:37.649+00
69	\N	\N	\N	\N	testEmail@test.com	$2a$12$uSXWcEOxazdxdYku7qluUOABKD/YzTqydbggSdUb3xx7ggxllp7ri	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-11-13 15:54:17.77+00	2017-11-13 15:54:17.77+00
1	Alvena	Ima	Muller	Forward Infrastructure Facilitator	Gaetano_Lind28@yahoo.com	Senior	\N	f	toverify	\N	saveme@forgot.com	017323434534	\N	\N	\N	\N	\N	\N	\N	2017-08-10 13:29:32+00	\N	\N	f	0	0	0	2017-08-10 13:29:32.531+00	2017-09-11 11:03:39.208+00
70	\N	\N	\N	\N	pas@calneu.de	$2a$12$SR9IHpeM8YB63BMdJMH.lOzTaAv5zXTpC7fboRlrJpcbilTYEz14.	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-11-15 12:27:07.825+00	2017-11-15 12:27:07.825+00
71	\N	\N	\N	\N	pas@cal2.de	$2a$12$XgHm6ddKngNh/xm.tfNKJ.HFPWqNV5wqLJ1j8PVN5yrRUru2SJjWO	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-11-16 13:13:38.064211+00	2017-11-16 13:13:38.064211+00
88	\N	\N	\N	\N	pascal.clanget@googlemail.com	$2a$05$xcMohfft8BbvCqSOVetbkuAONPjsSWwZ/YtFsxXBECy6fZS5X4gqe	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-11-19 13:53:55.73739+00	2017-11-19 13:53:55.73739+00
93	\N	\N	\N	\N	asdf@asd	$2a$05$KjSKMgoZCcir7DK.IaeaCe1iBnOA2M5a4wiSjL2L/SDP80/DHYNMC	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-11-19 15:18:19.790261+00	2017-11-19 15:18:19.790261+00
94	\N	\N	\N	\N	3asdf@asf333	$2a$05$r0PCvRtpPWt4APy8sWK6FO2RF6pbHVnEBahap3tvdeUhqd1lMfs1i	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-11-19 15:28:35.783309+00	2017-11-19 15:28:35.783309+00
95	\N	\N	\N	\N	pascal.clanget@fernuni-hagen.de	$2a$05$5QnApdj8dmF2eGfNZONltOdhEZXp8VY1AWegpjB74VpU02AsD9cFO	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-11-19 16:02:17.293378+00	2017-11-19 16:02:17.293378+00
96	\N	\N	\N	\N	pascal.clanget@ernuni-hagen.de	$2a$05$sB9/saXJ4crW060gPeAIAeMfrK1sznqlFjPwkrHBEcsMoe2NXdKSW	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-11-19 16:04:11.565973+00	2017-11-19 16:04:11.565973+00
91	\N	\N	\N	\N	pascal.clanget@studium.fernuni-hagen.de	$2a$12$t5GY2OcF7Riui2n0mBhcmedNe9XVbWsZ7yGHvacSEmKXI9oenbAVe	\N	\N	normal	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	0	0	0	2017-11-19 14:50:45.258495+00	2017-11-19 14:50:45.258495+00
89	\N	\N	\N	\N	test@testdafdsfasdf.de	$2a$12$.X0NFaeOwlQKNK0GNWBfGeBgzz7YxxNxkgZcpFgVYbOQjM3DSwC.G	\N	\N	normal	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	0	0	0	2017-11-19 14:27:49.715491+00	2017-11-19 14:27:49.715491+00
72	\N	\N	\N	\N	pas2@cal.de	$2a$12$KDTJ1gju2Ct0eQRVYIzOI.2HFLsaEmzoEqaCEmfit9OlQ9Pq5S6Lq	\N	\N	normal	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-11-16 13:30:43.296098+00	2017-11-16 13:30:43.296098+00
74	\N	\N	\N	\N	pas4@cal.de	$2a$12$1.uGkYlJjZYBXAkByeJ8c.ptpPfI4tJV9pgUKNrjnuLzND2qPPEz2	\N	\N	normal	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-11-16 13:45:40.322706+00	2017-11-16 13:45:40.322706+00
73	\N	\N	\N	\N	pas3@cal.de	$12$XdRwG4R99T.UvcKKlyGh.OStPhySPNT8cQrNOuK.15EM1Xn2VU9O.	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-11-16 13:33:33.120663+00	2017-11-16 13:33:33.120663+00
97	\N	\N	\N	\N	pc@vipfy.com	$2NC8YWI3UVmQJp93p0dWG.KZSuGgawyFvuRXSd01.cQLqpeVoR1yq	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-11-19 23:57:57.679939+00	2017-11-19 23:57:57.679939+00
67	Pascal	\N	Cousland	\N	pas@cal.de	$2a$12$eVSQCtpooPsRlmQkHFzbq.lJ0Bj.un/bYKZFlocGfoltDA3nQk7GK	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2017-11-09 11:31:38.948+00	2017-11-09 11:31:38.948+00
98	\N	\N	\N	\N	pas6@cal.de	05$9KGToG5WRimsrup1UeXFde2iJEgIsj85SHWmQB5p8C3JVFxqJc.8e	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2018-01-02 14:42:44+00	2018-01-02 14:42:44+00
99	\N	\N	\N	\N	pas7@cal.de	m0YMuOCDTZB9S0gW59lb.2t1p7F8b5lDFd2ByuEnO9.XlInkFZPu	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2018-01-02 14:44:23+00	2018-01-02 14:44:23+00
100	\N	\N	\N	\N	pas8@cal.de	$q3r4kkDNJjNdIZQQrzx5ruCIzNtiCHd.gzV1Q3f0yfPY6HLwij2we	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	0	0	0	2018-01-02 14:46:46+00	2018-01-02 14:46:46+00
102	\N	\N	\N	\N	n.vossebein@rps-hockey.de	05$7ZkuGtOtPa22nInELkUEreBrzl2VaSTGp/cG9hsFDwoUQi5CmocmO	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	0	0	0	2018-01-23 12:54:04+00	2018-01-23 12:54:04+00
104	\N	\N	\N	\N	office@vipfy.com	SzKlzfqTL2L48BtsHQJdzebkp2O3kkMoyrOTVMh29eTxe/uE/urD6	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	0	0	0	2018-01-23 13:06:39+00	2018-01-23 13:06:39+00
105	\N	\N	\N	\N	vipfy.development@googlemail.com	$7mNWXG2MWc5uUu6GHAH67Oy9mAlsjp6utCmqqXAHgvdv2BnOQixN2	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2018-01-23 17:51:51+00	2018-01-23 17:51:51+00
106	\N	\N	\N	\N	Vesta_Fisher82@hotmail.com	EvNAxMQMtFV2PnQNGJFBquvZH29KNmV/gZLf8PScFILzz4Yv1aqyy	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	0	0	0	2018-02-04 16:07:05+00	2018-02-04 16:07:05+00
107	\N	\N	\N	\N	newtestuser@vipfy.com	$2a$12$CkyTxXDU83zeVkItSKlY5OCI1nhqvr3P6jKqaP8hBo3IGnXvV.JYq	\N	\N	normal	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2018-02-04 16:07:05+00	2018-02-04 16:07:05+00
108	\N	\N	\N	\N	Brady_Quitzon@hotmail.com	$2a$12$hvgqHtiNA0ncHN8fvy4jg.LcS/uxYhBAOaXwo/FDXaJZQHv/fxc/a	\N	\N	normal	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	0	0	0	2018-02-04 16:07:06+00	2018-02-04 16:07:06+00
109	\N	\N	\N	\N	hioojj@test.com	$nmZRXuPbvJ0VdrY4JxdtBuk9PfdEqKJc.eXjOpdVuvq2YZZo.jINS	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	0	0	0	2018-02-06 15:42:55+00	2018-02-06 15:42:55+00
110	\N	\N	\N	\N	jf@vipfy.com	05$ByYwAdG.uA9bEOP9cViOBOT0AVKvS4lwEfSFySyljUgnKU.5PY9o.	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	0	0	0	2018-02-06 15:43:17+00	2018-02-06 15:43:17+00
111	\N	\N	\N	\N	test@example.invalid	$05$a2hNI7dAyXYCvhDkbOjBKulW442REOz0udSVjusQqqZTkR5l.ipaS	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	0	0	0	2018-02-20 01:15:52+00	2018-02-20 01:15:52+00
112	\N	\N	\N	\N	mm@vipfy.com	OZZsSrVFVyoynMw1IO1depSSTT2FGk.7f.TNsqwVisYzpP1LO	\N	\N	toverify	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	0	0	0	2018-03-14 19:54:34+00	2018-03-14 19:54:34+00
\.


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 112, true);


--
-- Data for Name: website_data; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.website_data (website, unitid, tag, verified, autogenerated, description, priority) FROM stdin;
\.


--
-- Name: address_data adress_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_data
    ADD CONSTRAINT adress_data_pkey PRIMARY KEY (id);


--
-- Name: app_data app_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_data
    ADD CONSTRAINT app_data_pkey PRIMARY KEY (id);


--
-- Name: appimages appimages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appimages
    ADD CONSTRAINT appimages_pkey PRIMARY KEY (id);


--
-- Name: appnotifications appnotifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appnotifications
    ADD CONSTRAINT appnotifications_pkey PRIMARY KEY (id);


--
-- Name: apps apps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.apps
    ADD CONSTRAINT apps_pkey PRIMARY KEY (id);


--
-- Name: bill_data bill_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_data
    ADD CONSTRAINT bill_data_pkey PRIMARY KEY (id);


--
-- Name: billposition_data billposition_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billposition_data
    ADD CONSTRAINT billposition_data_pkey PRIMARY KEY (id);


--
-- Name: boughtcompanyplans boughtcompanyplans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtcompanyplans
    ADD CONSTRAINT boughtcompanyplans_pkey PRIMARY KEY (companyid, appid, planid, datebought);


--
-- Name: boughtplan_data boughtplan_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtplan_data
    ADD CONSTRAINT boughtplan_data_pkey PRIMARY KEY (id);


--
-- Name: boughtsubplan_data boughtsubplan_data_boughtplanid_subplanid_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtsubplan_data
    ADD CONSTRAINT boughtsubplan_data_boughtplanid_subplanid_pk PRIMARY KEY (boughtplanid, subplanid);


--
-- Name: boughtuserplans boughtuserplans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtuserplans
    ADD CONSTRAINT boughtuserplans_pkey PRIMARY KEY (userid, appid, planid, datebought);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: department_data department_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_data
    ADD CONSTRAINT department_data_pkey PRIMARY KEY (unitid);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: developers developers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developers
    ADD CONSTRAINT developers_pkey PRIMARY KEY (id);


--
-- Name: email_data email_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_data
    ADD CONSTRAINT email_data_pkey PRIMARY KEY (email);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (companyid, departmentid, userid, begindate);


--
-- Name: human_data human_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.human_data
    ADD CONSTRAINT human_data_pkey PRIMARY KEY (unitid);


--
-- Name: licence_data licence_data_unitid_boughtplanid_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.licence_data
    ADD CONSTRAINT licence_data_unitid_boughtplanid_pk PRIMARY KEY (unitid, boughtplanid);


--
-- Name: log_data log_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_data
    ADD CONSTRAINT log_data_pkey PRIMARY KEY (id);


--
-- Name: message_data message_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_data
    ADD CONSTRAINT message_data_pkey PRIMARY KEY (id);


--
-- Name: newsletter_data newsletter_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.newsletter_data
    ADD CONSTRAINT newsletter_data_pkey PRIMARY KEY (email, activesince);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: parentunit_data parentunit_data_parentunit_childunit_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parentunit_data
    ADD CONSTRAINT parentunit_data_parentunit_childunit_pk PRIMARY KEY (parentunit, childunit);


--
-- Name: phone_data phone_data_unitid_number_pk; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phone_data
    ADD CONSTRAINT phone_data_unitid_number_pk UNIQUE (unitid, number);


--
-- Name: plan_data plan_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_data
    ADD CONSTRAINT plan_data_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: promo_data promo_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_data
    ADD CONSTRAINT promo_data_pkey PRIMARY KEY (id);


--
-- Name: reviewhelpful_data reviewhelpful_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviewhelpful_data
    ADD CONSTRAINT reviewhelpful_pkey PRIMARY KEY (reviewid, unitid);


--
-- Name: review_data reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_data
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: speaks speaks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.speaks
    ADD CONSTRAINT speaks_pkey PRIMARY KEY (userid, language);


--
-- Name: unit_data unit_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit_data
    ADD CONSTRAINT unit_data_pkey PRIMARY KEY (id);


--
-- Name: usedcompanyplans usedcompanyplans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usedcompanyplans
    ADD CONSTRAINT usedcompanyplans_pkey PRIMARY KEY (userid, appid, planid, companyid, planbought, usedfrom);


--
-- Name: userbills userbills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.userbills
    ADD CONSTRAINT userbills_pkey PRIMARY KEY (userid, date, billpos);


--
-- Name: userrights userrights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.userrights
    ADD CONSTRAINT userrights_pkey PRIMARY KEY (userid, companyid, departmentid, userright);


--
-- Name: users_data users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_data
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users_data users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_data
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: website_data website_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.website_data
    ADD CONSTRAINT website_data_pkey PRIMARY KEY (website);


--
-- Name: users_view _RETURN; Type: RULE; Schema: public; Owner: postgres
--

CREATE RULE "_RETURN" AS
    ON SELECT TO public.users_view DO INSTEAD  SELECT unit_data.id,
    human_data.firstname,
    human_data.middlename,
    human_data.lastname,
    human_data.title,
    human_data.sex,
    human_data.birthday,
    human_data.resetoption,
    human_data.language,
    unit_data.profilepicture,
    unit_data.payingoptions,
    unit_data.banned,
    unit_data.deleted,
    unit_data.suspended,
    unit_data.riskvalue,
    unit_data."position",
    unit_data.createdate,
    ( SELECT json_agg(json_build_object('email', email_data.email, 'verified', email_data.verified, 'autogenerated', email_data.autogenerated)) AS json_agg
           FROM public.email_data
          WHERE (email_data.unitid = unit_data.id)
          GROUP BY unit_data.id) AS emails
   FROM (public.human_data
     JOIN public.unit_data ON ((human_data.unitid = unit_data.id)))
  GROUP BY human_data.unitid, human_data.firstname, human_data.middlename, human_data.lastname, human_data.title, human_data.sex, human_data.birthday, human_data.resetoption, human_data.language, unit_data.id, unit_data.profilepicture, unit_data.banned, unit_data.deleted, unit_data.suspended, unit_data.riskvalue, unit_data."position";


--
-- Name: app_details _RETURN; Type: RULE; Schema: public; Owner: postgres
--

CREATE RULE "_RETURN" AS
    ON SELECT TO public.app_details DO INSTEAD  SELECT app_data.id,
    app_data.name,
    app_data.commission,
    app_data.logo,
    app_data.description,
    app_data.teaserdescription,
    app_data.website,
    app_data.supportunit,
    app_data.images,
    app_data.features,
    app_data.options,
    app_data.disabled,
    app_data.developer,
    round(avg(reviews.stars), 2) AS avgstars,
    min(plan_data.price) AS cheapestprice,
    ( SELECT min(LEAST((d2.price - ((promos_running.discount ->> 'absoluteDiscount'::text))::numeric(10,2)), (d2.price * ((1)::numeric - ((promos_running.discount ->> 'relativeDiscount'::text))::numeric(11,10))))) AS min
           FROM (public.promos_running
             JOIN public.plans_running d2 ON ((promos_running.planid = d2.id)))) AS cheapestpromo,
    ( SELECT website_data.website
           FROM public.website_data
          WHERE ((website_data.unitid = u.id) AND (website_data.tag = 'SUPPORT'::text))
          ORDER BY website_data.priority
         LIMIT 1) AS supportwebsite,
    ( SELECT phone_data.number
           FROM public.phone_data
          WHERE ((phone_data.unitid = u.id) AND (phone_data.tag = 'SUPPORT'::text))
          ORDER BY phone_data.priority
         LIMIT 1) AS supportphone,
    dev_dep.name AS developername,
    ( SELECT website_data.website
           FROM public.website_data
          WHERE (website_data.unitid = dev.id)
          ORDER BY website_data.priority
         LIMIT 1) AS developerwebsite
   FROM (((((public.app_data
     LEFT JOIN public.reviews ON ((app_data.id = reviews.appid)))
     LEFT JOIN public.plans_running plan_data ON ((app_data.id = plan_data.appid)))
     LEFT JOIN public.unit_data u ON ((app_data.supportunit = u.id)))
     LEFT JOIN public.unit_data dev ON ((app_data.developer = dev.id)))
     LEFT JOIN public.department_data dev_dep ON ((dev.id = dev_dep.unitid)))
  GROUP BY app_data.id, u.id, dev_dep.name, dev.id;


--
-- Name: review_view insertreview; Type: RULE; Schema: public; Owner: postgres
--

CREATE RULE insertreview AS
    ON INSERT TO public.review_view DO INSTEAD  INSERT INTO public.review_data (unitid, appid, reviewtext, stars)
  VALUES (new.unitid, new.appid, new.reviewtext, new.stars);


--
-- Name: right_data lowecase_right_on_insert_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER lowecase_right_on_insert_trigger BEFORE INSERT OR UPDATE ON public.right_data FOR EACH ROW EXECUTE PROCEDURE public.lowecase_right_on_insert();


--
-- Name: address_data adress_data_unitid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.address_data
    ADD CONSTRAINT adress_data_unitid_fkey FOREIGN KEY (unitid) REFERENCES public.unit_data(id);


--
-- Name: app_data app_data_developer_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_data
    ADD CONSTRAINT app_data_developer_fkey FOREIGN KEY (developer) REFERENCES public.unit_data(id);


--
-- Name: app_data app_data_supportunit_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_data
    ADD CONSTRAINT app_data_supportunit_fkey FOREIGN KEY (supportunit) REFERENCES public.unit_data(id);


--
-- Name: appimages appimages_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appimages
    ADD CONSTRAINT appimages_appid_fkey FOREIGN KEY (appid) REFERENCES public.apps(id);


--
-- Name: appnotifications appnotifications_fromapp_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appnotifications
    ADD CONSTRAINT appnotifications_fromapp_fkey FOREIGN KEY (fromapp) REFERENCES public.apps(id);


--
-- Name: appnotifications appnotifications_touser_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.appnotifications
    ADD CONSTRAINT appnotifications_touser_fkey FOREIGN KEY (touser) REFERENCES public.users_data(id);


--
-- Name: apps apps_developerid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.apps
    ADD CONSTRAINT apps_developerid_fkey FOREIGN KEY (developerid) REFERENCES public.developers(id);


--
-- Name: bill_data bill_data_unitid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bill_data
    ADD CONSTRAINT bill_data_unitid_fkey FOREIGN KEY (unitid) REFERENCES public.unit_data(id);


--
-- Name: billposition_data billposition_data_billid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billposition_data
    ADD CONSTRAINT billposition_data_billid_fkey FOREIGN KEY (billid) REFERENCES public.bill_data(id);


--
-- Name: billposition_data billposition_data_planid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billposition_data
    ADD CONSTRAINT billposition_data_planid_fkey FOREIGN KEY (planid) REFERENCES public.plan_data(id);


--
-- Name: billposition_data billposition_data_vendor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.billposition_data
    ADD CONSTRAINT billposition_data_vendor_fkey FOREIGN KEY (vendor) REFERENCES public.unit_data(id);


--
-- Name: boughtcompanyplans boughtcompanyplans_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtcompanyplans
    ADD CONSTRAINT boughtcompanyplans_appid_fkey FOREIGN KEY (appid) REFERENCES public.apps(id);


--
-- Name: boughtcompanyplans boughtcompanyplans_companyid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtcompanyplans
    ADD CONSTRAINT boughtcompanyplans_companyid_fkey FOREIGN KEY (companyid) REFERENCES public.companies(id);


--
-- Name: boughtcompanyplans boughtcompanyplans_planid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtcompanyplans
    ADD CONSTRAINT boughtcompanyplans_planid_fkey FOREIGN KEY (planid) REFERENCES public.plans(id);


--
-- Name: boughtplan_data boughtplan_data_boughtplan_data_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtplan_data
    ADD CONSTRAINT boughtplan_data_boughtplan_data_id_fk FOREIGN KEY (predecessor) REFERENCES public.boughtplan_data(id);


--
-- Name: boughtplan_data boughtplan_data_buyer_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtplan_data
    ADD CONSTRAINT boughtplan_data_buyer_fkey FOREIGN KEY (buyer) REFERENCES public.unit_data(id);


--
-- Name: boughtplan_data boughtplan_data_payer_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtplan_data
    ADD CONSTRAINT boughtplan_data_payer_fkey FOREIGN KEY (payer) REFERENCES public.unit_data(id);


--
-- Name: boughtplan_data boughtplan_data_planid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtplan_data
    ADD CONSTRAINT boughtplan_data_planid_fkey FOREIGN KEY (planid) REFERENCES public.plan_data(id);


--
-- Name: boughtsubplan_data boughtsubplan_data_boughtplan_data_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtsubplan_data
    ADD CONSTRAINT boughtsubplan_data_boughtplan_data_id_fk FOREIGN KEY (boughtplanid) REFERENCES public.boughtplan_data(id);


--
-- Name: boughtsubplan_data boughtsubplan_data_plan_data_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtsubplan_data
    ADD CONSTRAINT boughtsubplan_data_plan_data_id_fk FOREIGN KEY (subplanid) REFERENCES public.plan_data(id);


--
-- Name: boughtuserplans boughtuserplans_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtuserplans
    ADD CONSTRAINT boughtuserplans_appid_fkey FOREIGN KEY (appid) REFERENCES public.apps(id);


--
-- Name: boughtuserplans boughtuserplans_planid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtuserplans
    ADD CONSTRAINT boughtuserplans_planid_fkey FOREIGN KEY (planid) REFERENCES public.plans(id);


--
-- Name: boughtuserplans boughtuserplans_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.boughtuserplans
    ADD CONSTRAINT boughtuserplans_userid_fkey FOREIGN KEY (userid) REFERENCES public.users_data(id);


--
-- Name: companybills companybills_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companybills
    ADD CONSTRAINT companybills_appid_fkey FOREIGN KEY (appid) REFERENCES public.apps(id);


--
-- Name: companybills companybills_companyid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companybills
    ADD CONSTRAINT companybills_companyid_fkey FOREIGN KEY (companyid) REFERENCES public.companies(id);


--
-- Name: department_data department_data_unitid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_data
    ADD CONSTRAINT department_data_unitid_fkey FOREIGN KEY (unitid) REFERENCES public.unit_data(id);


--
-- Name: departments departments_companyid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_companyid_fkey FOREIGN KEY (companyid) REFERENCES public.companies(id);


--
-- Name: email_data email_data_unitid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_data
    ADD CONSTRAINT email_data_unitid_fkey FOREIGN KEY (unitid) REFERENCES public.unit_data(id) ON DELETE CASCADE;


--
-- Name: employees employees_companyid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_companyid_fkey FOREIGN KEY (companyid) REFERENCES public.companies(id);


--
-- Name: employees employees_departmentid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_departmentid_fkey FOREIGN KEY (departmentid) REFERENCES public.departments(id);


--
-- Name: employees employees_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_userid_fkey FOREIGN KEY (userid) REFERENCES public.users_data(id);


--
-- Name: human_data human_data_unit_data_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.human_data
    ADD CONSTRAINT human_data_unit_data_id_fk FOREIGN KEY (unitid) REFERENCES public.unit_data(id) ON DELETE CASCADE;


--
-- Name: licence_data licence_data_boughtplanid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.licence_data
    ADD CONSTRAINT licence_data_boughtplanid_fkey FOREIGN KEY (boughtplanid) REFERENCES public.boughtplan_data(id);


--
-- Name: licence_data licence_data_unitid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.licence_data
    ADD CONSTRAINT licence_data_unitid_fkey FOREIGN KEY (unitid) REFERENCES public.unit_data(id) ON DELETE CASCADE;


--
-- Name: log_data log_data_unit_data_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_data
    ADD CONSTRAINT log_data_unit_data_id_fk FOREIGN KEY ("user") REFERENCES public.unit_data(id);


--
-- Name: log_data log_data_unit_data_id_fk_2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_data
    ADD CONSTRAINT log_data_unit_data_id_fk_2 FOREIGN KEY (sudoer) REFERENCES public.unit_data(id);


--
-- Name: message_data message_data_receiver_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_data
    ADD CONSTRAINT message_data_receiver_fkey FOREIGN KEY (receiver) REFERENCES public.unit_data(id) ON DELETE CASCADE;


--
-- Name: message_data message_data_sender_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.message_data
    ADD CONSTRAINT message_data_sender_fkey FOREIGN KEY (sender) REFERENCES public.unit_data(id);


--
-- Name: notifications notifications_fromuser_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_fromuser_fkey FOREIGN KEY (fromuser) REFERENCES public.users_data(id);


--
-- Name: notifications notifications_touser_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_touser_fkey FOREIGN KEY (touser) REFERENCES public.users_data(id);


--
-- Name: parentunit_data parentunit_data_unit_data_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parentunit_data
    ADD CONSTRAINT parentunit_data_unit_data_id_fk FOREIGN KEY (parentunit) REFERENCES public.unit_data(id);


--
-- Name: parentunit_data parentunit_data_unit_data_id_fk_2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.parentunit_data
    ADD CONSTRAINT parentunit_data_unit_data_id_fk_2 FOREIGN KEY (childunit) REFERENCES public.unit_data(id);


--
-- Name: phone_data phone_data_unitid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.phone_data
    ADD CONSTRAINT phone_data_unitid_fkey FOREIGN KEY (unitid) REFERENCES public.unit_data(id);


--
-- Name: plan_data plan_data_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_data
    ADD CONSTRAINT plan_data_appid_fkey FOREIGN KEY (appid) REFERENCES public.app_data(id);


--
-- Name: plan_data plan_data_plan_data_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_data
    ADD CONSTRAINT plan_data_plan_data_id_fk FOREIGN KEY (mainplan) REFERENCES public.plan_data(id);


--
-- Name: plan_data plan_data_plan_data_id_fk_2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_data
    ADD CONSTRAINT plan_data_plan_data_id_fk_2 FOREIGN KEY (gotoplan) REFERENCES public.plan_data(id);


--
-- Name: plans plans_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_appid_fkey FOREIGN KEY (appid) REFERENCES public.apps(id);


--
-- Name: promo_data promo_data_planid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_data
    ADD CONSTRAINT promo_data_planid_fkey FOREIGN KEY (planid) REFERENCES public.plan_data(id);


--
-- Name: promo_data promo_data_sponsor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.promo_data
    ADD CONSTRAINT promo_data_sponsor_fkey FOREIGN KEY (sponsor) REFERENCES public.unit_data(id);


--
-- Name: review_data review_data_human_data_unitid_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_data
    ADD CONSTRAINT review_data_human_data_unitid_fk FOREIGN KEY (unitid) REFERENCES public.human_data(unitid);


--
-- Name: reviewhelpful_data reviewhelpful_reviewid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviewhelpful_data
    ADD CONSTRAINT reviewhelpful_reviewid_fkey FOREIGN KEY (reviewid) REFERENCES public.review_data(id);


--
-- Name: reviewhelpful reviewhelpful_reviewid_fkey1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviewhelpful
    ADD CONSTRAINT reviewhelpful_reviewid_fkey1 FOREIGN KEY (reviewid) REFERENCES public.review_data(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: reviewhelpful_data reviewhelpful_unit_data_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviewhelpful_data
    ADD CONSTRAINT reviewhelpful_unit_data_id_fk FOREIGN KEY (unitid) REFERENCES public.unit_data(id);


--
-- Name: reviewhelpful reviewhelpful_unitid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviewhelpful
    ADD CONSTRAINT reviewhelpful_unitid_fkey FOREIGN KEY (unitid) REFERENCES public.unit_data(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: review_data reviews_answerto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_data
    ADD CONSTRAINT reviews_answerto_fkey FOREIGN KEY (answerto) REFERENCES public.review_data(id);


--
-- Name: review_data reviews_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.review_data
    ADD CONSTRAINT reviews_appid_fkey FOREIGN KEY (appid) REFERENCES public.app_data(id);


--
-- Name: right_data right_data_unit_data_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.right_data
    ADD CONSTRAINT right_data_unit_data_id_fk FOREIGN KEY (holder) REFERENCES public.unit_data(id) ON DELETE CASCADE;


--
-- Name: right_data right_data_unit_data_id_fk_2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.right_data
    ADD CONSTRAINT right_data_unit_data_id_fk_2 FOREIGN KEY (forunit) REFERENCES public.unit_data(id) ON DELETE CASCADE;


--
-- Name: speaks speaks_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.speaks
    ADD CONSTRAINT speaks_userid_fkey FOREIGN KEY (userid) REFERENCES public.users_data(id);


--
-- Name: usedcompanyplans usedcompanyplans_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usedcompanyplans
    ADD CONSTRAINT usedcompanyplans_appid_fkey FOREIGN KEY (appid, planid, companyid, planbought) REFERENCES public.boughtcompanyplans(companyid, appid, planid, datebought);


--
-- Name: usedcompanyplans usedcompanyplans_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usedcompanyplans
    ADD CONSTRAINT usedcompanyplans_userid_fkey FOREIGN KEY (userid) REFERENCES public.users_data(id);


--
-- Name: userbills userbills_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.userbills
    ADD CONSTRAINT userbills_appid_fkey FOREIGN KEY (appid) REFERENCES public.apps(id);


--
-- Name: userbills userbills_planid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.userbills
    ADD CONSTRAINT userbills_planid_fkey FOREIGN KEY (planid) REFERENCES public.plans(id);


--
-- Name: userbills userbills_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.userbills
    ADD CONSTRAINT userbills_userid_fkey FOREIGN KEY (userid) REFERENCES public.users_data(id);


--
-- Name: userrights userrights_companyid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.userrights
    ADD CONSTRAINT userrights_companyid_fkey FOREIGN KEY (companyid) REFERENCES public.companies(id);


--
-- Name: userrights userrights_departmentid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.userrights
    ADD CONSTRAINT userrights_departmentid_fkey FOREIGN KEY (departmentid) REFERENCES public.departments(id);


--
-- Name: userrights userrights_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.userrights
    ADD CONSTRAINT userrights_userid_fkey FOREIGN KEY (userid) REFERENCES public.users_data(id);


--
-- Name: website_data website_data_unitid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.website_data
    ADD CONSTRAINT website_data_unitid_fkey FOREIGN KEY (unitid) REFERENCES public.unit_data(id);


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: cloudsqlsuperuser
--

REVOKE ALL ON SCHEMA public FROM cloudsqladmin;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO cloudsqlsuperuser;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

