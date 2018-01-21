--
-- PostgreSQL database dump
--

-- Dumped from database version 9.6.1
-- Dumped by pg_dump version 9.6.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: postgres; Type: COMMENT; Schema: -; Owner: cloudsqlsuperuser
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


SET search_path = public, pg_catalog;

--
-- Name: enum_users_sex; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE enum_users_sex AS ENUM (
    'm',
    'w',
    't'
);


ALTER TYPE enum_users_sex OWNER TO postgres;

--
-- Name: enum_users_userStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE "enum_users_userStatus" AS ENUM (
    'toverify',
    'normal',
    'banned',
    'onlynews'
);


ALTER TYPE "enum_users_userStatus" OWNER TO postgres;

--
-- Name: enum_users_userstatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE enum_users_userstatus AS ENUM (
    'toverify',
    'normal',
    'banned',
    'onlynews'
);


ALTER TYPE enum_users_userstatus OWNER TO postgres;

--
-- Name: languages; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE languages AS ENUM (
    'English'
);


ALTER TYPE languages OWNER TO postgres;

--
-- Name: userstatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE userstatus AS ENUM (
    'toverify',
    'normal',
    'banned',
    'onlynews'
);


ALTER TYPE userstatus OWNER TO postgres;

--
-- Name: insert_company(character varying, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION insert_company(compname character varying, userid integer) RETURNS integer
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

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: appimages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE appimages (
    id integer NOT NULL,
    appid integer,
    link character varying(50),
    sequence smallint
);


ALTER TABLE appimages OWNER TO postgres;

--
-- Name: appimages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE appimages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE appimages_id_seq OWNER TO postgres;

--
-- Name: appimages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE appimages_id_seq OWNED BY appimages.id;


--
-- Name: appnotifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE appnotifications (
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


ALTER TABLE appnotifications OWNER TO postgres;

--
-- Name: appnotifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE appnotifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE appnotifications_id_seq OWNER TO postgres;

--
-- Name: appnotifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE appnotifications_id_seq OWNED BY appnotifications.id;


--
-- Name: apps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE apps (
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


ALTER TABLE apps OWNER TO postgres;

--
-- Name: apps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE apps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE apps_id_seq OWNER TO postgres;

--
-- Name: apps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE apps_id_seq OWNED BY apps.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE reviews (
    userid integer NOT NULL,
    appid integer NOT NULL,
    reviewdate timestamp without time zone DEFAULT now() NOT NULL,
    stars smallint,
    reviewtext text,
    id integer NOT NULL,
    answerto integer
);


ALTER TABLE reviews OWNER TO postgres;

--
-- Name: apps_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW apps_view AS
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
   FROM (apps
     LEFT JOIN ( SELECT reviews.appid,
            (avg(reviews.stars))::numeric(2,1) AS avg_stars,
            count(reviews.stars) AS count_stars
           FROM reviews
          WHERE ((reviews.userid, reviews.reviewdate) IN ( SELECT reviews_1.userid,
                    max(reviews_1.reviewdate) AS max
                   FROM reviews reviews_1
                  GROUP BY reviews_1.userid))
          GROUP BY reviews.appid) a ON ((apps.id = a.appid)));


ALTER TABLE apps_view OWNER TO postgres;

--
-- Name: boughtcompanyplans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE boughtcompanyplans (
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


ALTER TABLE boughtcompanyplans OWNER TO postgres;

--
-- Name: boughtuserplans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE boughtuserplans (
    userid integer NOT NULL,
    appid integer NOT NULL,
    planid integer NOT NULL,
    datebought timestamp without time zone DEFAULT now() NOT NULL,
    planfinish timestamp without time zone,
    key character varying(256),
    lastrenewal timestamp without time zone DEFAULT now(),
    numrenewal integer
);


ALTER TABLE boughtuserplans OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE companies (
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


ALTER TABLE companies OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE companies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE companies_id_seq OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE companies_id_seq OWNED BY companies.id;


--
-- Name: companybills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE companybills (
    companyid integer,
    date timestamp without time zone DEFAULT now(),
    billpos integer,
    textpos character varying(256),
    price money,
    currency character(3),
    appid integer,
    planid integer
);


ALTER TABLE companybills OWNER TO postgres;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE departments (
    companyid integer NOT NULL,
    name character varying(40),
    addresscountry character varying(20),
    addressstate character varying(20),
    addresscity character varying(20),
    addressstreet character varying(20),
    addressnumber smallint,
    id integer NOT NULL
);


ALTER TABLE departments OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE departments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE departments_id_seq OWNER TO postgres;

--
-- Name: departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE departments_id_seq OWNED BY departments.id;


--
-- Name: developers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE developers (
    id integer NOT NULL,
    name character varying(40),
    website character varying(50),
    legalwebsite character varying(50),
    bankaccount character varying(30)
);


ALTER TABLE developers OWNER TO postgres;

--
-- Name: developers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE developers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE developers_id_seq OWNER TO postgres;

--
-- Name: developers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE developers_id_seq OWNED BY developers.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE employees (
    companyid integer NOT NULL,
    departmentid integer NOT NULL,
    userid integer NOT NULL,
    begindate date DEFAULT ('now'::text)::date NOT NULL,
    enddate date,
    "position" character varying(20)
);


ALTER TABLE employees OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE notifications (
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


ALTER TABLE notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE notifications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE notifications_id_seq OWNED BY notifications.id;


--
-- Name: plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE plans (
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


ALTER TABLE plans OWNER TO postgres;

--
-- Name: plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE plans_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE plans_id_seq OWNER TO postgres;

--
-- Name: plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE plans_id_seq OWNED BY plans.id;


--
-- Name: reviewhelpful; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE reviewhelpful (
    reviewid integer NOT NULL,
    userid integer NOT NULL,
    helpfuldate timestamp without time zone DEFAULT now(),
    comment text,
    balance smallint
);


ALTER TABLE reviewhelpful OWNER TO postgres;

--
-- Name: review_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW review_view AS
 SELECT reviews.userid,
    reviews.appid,
    reviews.reviewdate,
    reviews.stars,
    reviews.reviewtext,
    reviews.id,
    reviews.answerto,
    count(*) FILTER (WHERE (reviewhelpful.balance = 1)) AS counthelpful,
    count(*) FILTER (WHERE (reviewhelpful.balance = 2)) AS countunhelpful,
    count(*) FILTER (WHERE (reviewhelpful.balance = 0)) AS countcomment
   FROM (reviews
     LEFT JOIN reviewhelpful ON ((reviews.id = reviewhelpful.reviewid)))
  GROUP BY reviews.userid, reviews.appid, reviews.reviewdate, reviews.stars, reviews.reviewtext, reviews.id, reviews.answerto;


ALTER TABLE review_view OWNER TO postgres;

--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE reviews_id_seq OWNER TO postgres;

--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE reviews_id_seq OWNED BY reviews.id;


--
-- Name: speaks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE speaks (
    userid integer NOT NULL,
    language languages DEFAULT 'English'::languages NOT NULL,
    preferred boolean DEFAULT false
);


ALTER TABLE speaks OWNER TO postgres;

--
-- Name: usedcompanyplans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE usedcompanyplans (
    userid integer NOT NULL,
    appid integer NOT NULL,
    planid integer NOT NULL,
    companyid integer NOT NULL,
    planbought timestamp without time zone NOT NULL,
    key character varying(256),
    usedfrom timestamp without time zone DEFAULT now() NOT NULL,
    usedto timestamp without time zone
);


ALTER TABLE usedcompanyplans OWNER TO postgres;

--
-- Name: userbills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE userbills (
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


ALTER TABLE userbills OWNER TO postgres;

--
-- Name: userrights; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE userrights (
    userid integer NOT NULL,
    companyid integer NOT NULL,
    departmentid integer NOT NULL,
    userright integer NOT NULL
);


ALTER TABLE userrights OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE users (
    id integer NOT NULL,
    firstname character varying(255),
    middlename character varying(255),
    lastname character varying(255),
    "position" character varying(255),
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    title character varying(255),
    sex character(1),
    userstatus "enum_users_userStatus" DEFAULT 'toverify'::"enum_users_userStatus",
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


ALTER TABLE users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE users_id_seq OWNED BY users.id;


--
-- Name: appimages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY appimages ALTER COLUMN id SET DEFAULT nextval('appimages_id_seq'::regclass);


--
-- Name: appnotifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY appnotifications ALTER COLUMN id SET DEFAULT nextval('appnotifications_id_seq'::regclass);


--
-- Name: apps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY apps ALTER COLUMN id SET DEFAULT nextval('apps_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY companies ALTER COLUMN id SET DEFAULT nextval('companies_id_seq'::regclass);


--
-- Name: departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY departments ALTER COLUMN id SET DEFAULT nextval('departments_id_seq'::regclass);


--
-- Name: developers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY developers ALTER COLUMN id SET DEFAULT nextval('developers_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY notifications ALTER COLUMN id SET DEFAULT nextval('notifications_id_seq'::regclass);


--
-- Name: plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY plans ALTER COLUMN id SET DEFAULT nextval('plans_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY reviews ALTER COLUMN id SET DEFAULT nextval('reviews_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY users ALTER COLUMN id SET DEFAULT nextval('users_id_seq'::regclass);


--
-- Data for Name: appimages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY appimages (id, appid, link, sequence) FROM stdin;
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

SELECT pg_catalog.setval('appimages_id_seq', 39, true);


--
-- Data for Name: appnotifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY appnotifications (id, type, touser, fromapp, sendtime, readtime, deleted, senderdeleted, message) FROM stdin;
1	1	61	4	2017-12-26 21:32:28.683334	2017-12-27 18:49:46.641	t	f	Domo Arigato, Mr. Roboto
2	1	61	4	2017-12-28 15:17:04.068985	\N	f	f	...that was when I ruled the world.
3	1	67	4	2017-12-31 13:32:58.75916	\N	f	f	...that was when I ruled the world.
5	1	67	2	2017-12-31 13:33:29.747131	\N	f	f	Oh ho hoho hoho...
\.


--
-- Name: appnotifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('appnotifications_id_seq', 5, true);


--
-- Data for Name: apps; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY apps (id, developerid, name, percentage, description, applogo, versionnumber, updatedate, teaserdescription, ownpage, supportwebsite, supportphone, modaltype) FROM stdin;
1	1	Weebly	\N	Web-hosting service featuring a drag-and-drop website builder. Include a Shop- and Newsletter-Plugin	weebly.svg	\N	\N	\N	\N	\N	\N	0
2	2	Slack	\N	Cloud-based team collaboration tool that offers persistent chat rooms (channels) organized by topic, as well as private groups and direct messaging. All content inside Slack is searchable, including files, conversations, and people	slack.svg	\N	\N	\N	\N	\N	\N	0
3	3	Pipedrive	\N	The leading sales management tool small teams love to use.	pipedrive.svg	\N	\N	\N	\N	\N	\N	0
4	4	Google Apps	\N	All you need to do your best work, together in one package that works seamlessly from your computer, phone or tablet	google-apps.svg	\N	\N	\N	\N	\N	\N	0
5	5	Moo	\N	Premium Business Cards, Luxe Business Cards, Postcards, Stickers and more	Moo-logo.png	\N	\N	\N	\N	\N	\N	0
6	6	Vistaprint	\N	Printing and real-time design help	vistaprint_2014_logo_detail.png	\N	\N	\N	\N	\N	\N	0
7	7	CakeHR	\N	Manage employee leave and time off. Detailed employee and company reports	cake.png	\N	\N	\N	\N	\N	\N	0
8	8	Xero	\N	Online accounting software for your small business	xero.svg	\N	\N	\N	\N	\N	\N	0
9	9	Waveapps	\N	Create and send professional invoices, estimates and receipts in seconds. Track the status of your invoices and payments so you can know when to expect money in your bank account	wave.png	\N	\N	\N	\N	\N	\N	0
11	20	DD24	\N	User-friendly retail customer portal for domain registration and management	dd24.png	\N	\N	\N	\N	\N	\N	1
\.


--
-- Name: apps_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('apps_id_seq', 11, true);


--
-- Data for Name: boughtcompanyplans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY boughtcompanyplans (companyid, appid, planid, datebought, planfinish, key, lastrenewal, numrenewal, numlicences) FROM stdin;
\.


--
-- Data for Name: boughtuserplans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY boughtuserplans (userid, appid, planid, datebought, planfinish, key, lastrenewal, numrenewal) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY companies (id, name, companylogo, addresscountry, addressstate, addresscity, addressstreet, addressnumber, family) FROM stdin;
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

SELECT pg_catalog.setval('companies_id_seq', 19, true);


--
-- Data for Name: companybills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY companybills (companyid, date, billpos, textpos, price, currency, appid, planid) FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY departments (companyid, name, addresscountry, addressstate, addresscity, addressstreet, addressnumber, id) FROM stdin;
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

SELECT pg_catalog.setval('departments_id_seq', 12, true);


--
-- Data for Name: developers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY developers (id, name, website, legalwebsite, bankaccount) FROM stdin;
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

SELECT pg_catalog.setval('developers_id_seq', 20, true);


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY employees (companyid, departmentid, userid, begindate, enddate, "position") FROM stdin;
19	12	61	2017-12-06	\N	Admin
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY notifications (id, type, touser, fromuser, sendtime, readtime, deleted, senderdeleted, message) FROM stdin;
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
6	1	8	6	2017-12-28 22:26:58.492319	\N	f	f	
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
\.


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('notifications_id_seq', 222, true);


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY plans (id, appid, description, renewalplan, period, numlicences, price, currency, name, activefrom, activeuntil, promo, promovipfy, promodeveloper, promoname, changeafter, changeplan) FROM stdin;
1	1	<ul><li>Websitebuilder</li><li>One User</li><li>Standard Support</li><ul>	\N	1	1	10.00	USD	Standard	\N	\N	\N	\N	\N	\N	\N	\N
2	1	<ul><li>Websitebuilder</li><li>Five Users</li><li>Standard Support</li><ul>	\N	1	5	30.00	USD	Group	\N	\N	\N	\N	\N	\N	\N	\N
3	2	\N	\N	1	5	40.00	USD	Group	\N	\N	\N	\N	\N	\N	\N	\N
4	2	One year for you	\N	12	1	120.00	USD	Individual	\N	\N	\N	\N	\N	\N	\N	\N
5	2	One year for your company	\N	12	5	500.00	USD	Group Year	\N	\N	\N	\N	\N	\N	\N	\N
8	11	special	\N	1	1	11.00	USD	test	\N	\N	\N	\N	\N	\N	\N	\N
\.


--
-- Name: plans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('plans_id_seq', 8, true);


--
-- Data for Name: reviewhelpful; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY reviewhelpful (reviewid, userid, helpfuldate, comment, balance) FROM stdin;
3	4	2017-12-29 02:51:45	\N	1
7	4	2017-12-29 07:34:47	\N	1
3	61	2017-12-29 15:57:43.510069	Nice Review	1
3	6	2017-12-29 15:58:26.588987	Nice Review	0
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY reviews (userid, appid, reviewdate, stars, reviewtext, id, answerto) FROM stdin;
1	1	2017-01-22 00:00:00	4	Good App	1	\N
9	9	2017-07-23 00:00:00	4	Sit et aut.	2	\N
8	1	2017-09-06 00:00:00	3	Quia molestiae enim repellendus eveniet.	3	\N
1	6	2016-10-13 00:00:00	2	Molestiae ut aut facilis vero.	4	\N
3	6	2017-06-08 00:00:00	4	Unde aliquam numquam rerum illum itaque. Iusto a quibusdam rem molestiae omnis porro nam dolores autem. Delectus est vel. Est tenetur fugit. Molestiae deleniti minima natus. Eius vero quibusdam.	5	\N
11	2	2017-05-01 00:00:00	2	Amet excepturi sit rem dolores omnis. Ex voluptas dolor et voluptates aliquid et. Enim quasi atque facilis natus fuga iusto aut. Ipsam modi inventore blanditiis vel sit aliquam rerum dolore.	6	\N
4	8	2017-03-30 00:00:00	1	Amet ea et quae veniam iusto maiores.	7	\N
8	1	2016-12-13 00:00:00	2	nostrum	8	\N
15	1	2017-05-09 00:00:00	5	Fuga consequatur dolorum ad consequatur. Odio et vel. Sed aut nemo. Aliquid eveniet officiis aliquid quam sapiente enim. Asperiores quas alias placeat sed. Eligendi corporis quia.	9	\N
5	8	2017-01-30 00:00:00	1	Rerum dolorem amet at repellendus.	10	\N
15	3	2017-04-24 00:00:00	2	Ex fugiat voluptas pariatur dolores earum est. Suscipit non ratione molestias consequuntur optio voluptas quos. Voluptatem ut eum aspernatur pariatur quae.	11	\N
2	4	2017-12-29 00:00:00	3	Denn ich war nie ein Rapper und bin es immer noch nicht,...	12	\N
2	4	2017-12-29 00:00:00	6	Schau her, ich bin immer noch ich!	13	\N
\.


--
-- Name: reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('reviews_id_seq', 13, true);


--
-- Data for Name: speaks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY speaks (userid, language, preferred) FROM stdin;
\.


--
-- Data for Name: usedcompanyplans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY usedcompanyplans (userid, appid, planid, companyid, planbought, key, usedfrom, usedto) FROM stdin;
\.


--
-- Data for Name: userbills; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY userbills (userid, date, billpos, textpos, price, currency, appid, planid, orgcurrency, exchangerate) FROM stdin;
5	2017-12-30 15:17:01.598623	1	Eine Position	11.20	USD	1	1	EUR	1.0300000000
\.


--
-- Data for Name: userrights; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY userrights (userid, companyid, departmentid, userright) FROM stdin;
61	17	12	1
61	19	12	1
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY users (id, firstname, middlename, lastname, "position", email, password, title, sex, userstatus, birthday, recoveryemail, mobilenumber, telefonnumber, addresscountry, addressstate, addresscity, addressstreet, addressnumber, profilepicture, lastactive, lastsecret, riskvalue, newsletter, referall, cobranded, resetoption, "createdAt", "updatedAt") FROM stdin;
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
\.


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('users_id_seq', 100, true);


--
-- Name: appimages appimages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY appimages
    ADD CONSTRAINT appimages_pkey PRIMARY KEY (id);


--
-- Name: appnotifications appnotifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY appnotifications
    ADD CONSTRAINT appnotifications_pkey PRIMARY KEY (id);


--
-- Name: apps apps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY apps
    ADD CONSTRAINT apps_pkey PRIMARY KEY (id);


--
-- Name: boughtcompanyplans boughtcompanyplans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY boughtcompanyplans
    ADD CONSTRAINT boughtcompanyplans_pkey PRIMARY KEY (companyid, appid, planid, datebought);


--
-- Name: boughtuserplans boughtuserplans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY boughtuserplans
    ADD CONSTRAINT boughtuserplans_pkey PRIMARY KEY (userid, appid, planid, datebought);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: developers developers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY developers
    ADD CONSTRAINT developers_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (companyid, departmentid, userid, begindate);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: reviewhelpful reviewhelpful_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY reviewhelpful
    ADD CONSTRAINT reviewhelpful_pkey PRIMARY KEY (reviewid, userid);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: speaks speaks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY speaks
    ADD CONSTRAINT speaks_pkey PRIMARY KEY (userid, language);


--
-- Name: usedcompanyplans usedcompanyplans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY usedcompanyplans
    ADD CONSTRAINT usedcompanyplans_pkey PRIMARY KEY (userid, appid, planid, companyid, planbought, usedfrom);


--
-- Name: userbills userbills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY userbills
    ADD CONSTRAINT userbills_pkey PRIMARY KEY (userid, date, billpos);


--
-- Name: userrights userrights_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY userrights
    ADD CONSTRAINT userrights_pkey PRIMARY KEY (userid, companyid, departmentid, userright);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: appimages appimages_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY appimages
    ADD CONSTRAINT appimages_appid_fkey FOREIGN KEY (appid) REFERENCES apps(id);


--
-- Name: appnotifications appnotifications_fromapp_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY appnotifications
    ADD CONSTRAINT appnotifications_fromapp_fkey FOREIGN KEY (fromapp) REFERENCES apps(id);


--
-- Name: appnotifications appnotifications_touser_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY appnotifications
    ADD CONSTRAINT appnotifications_touser_fkey FOREIGN KEY (touser) REFERENCES users(id);


--
-- Name: apps apps_developerid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY apps
    ADD CONSTRAINT apps_developerid_fkey FOREIGN KEY (developerid) REFERENCES developers(id);


--
-- Name: boughtcompanyplans boughtcompanyplans_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY boughtcompanyplans
    ADD CONSTRAINT boughtcompanyplans_appid_fkey FOREIGN KEY (appid) REFERENCES apps(id);


--
-- Name: boughtcompanyplans boughtcompanyplans_companyid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY boughtcompanyplans
    ADD CONSTRAINT boughtcompanyplans_companyid_fkey FOREIGN KEY (companyid) REFERENCES companies(id);


--
-- Name: boughtcompanyplans boughtcompanyplans_planid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY boughtcompanyplans
    ADD CONSTRAINT boughtcompanyplans_planid_fkey FOREIGN KEY (planid) REFERENCES plans(id);


--
-- Name: boughtuserplans boughtuserplans_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY boughtuserplans
    ADD CONSTRAINT boughtuserplans_appid_fkey FOREIGN KEY (appid) REFERENCES apps(id);


--
-- Name: boughtuserplans boughtuserplans_planid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY boughtuserplans
    ADD CONSTRAINT boughtuserplans_planid_fkey FOREIGN KEY (planid) REFERENCES plans(id);


--
-- Name: boughtuserplans boughtuserplans_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY boughtuserplans
    ADD CONSTRAINT boughtuserplans_userid_fkey FOREIGN KEY (userid) REFERENCES users(id);


--
-- Name: companybills companybills_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY companybills
    ADD CONSTRAINT companybills_appid_fkey FOREIGN KEY (appid) REFERENCES apps(id);


--
-- Name: companybills companybills_companyid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY companybills
    ADD CONSTRAINT companybills_companyid_fkey FOREIGN KEY (companyid) REFERENCES companies(id);


--
-- Name: departments departments_companyid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY departments
    ADD CONSTRAINT departments_companyid_fkey FOREIGN KEY (companyid) REFERENCES companies(id);


--
-- Name: employees employees_companyid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY employees
    ADD CONSTRAINT employees_companyid_fkey FOREIGN KEY (companyid) REFERENCES companies(id);


--
-- Name: employees employees_departmentid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY employees
    ADD CONSTRAINT employees_departmentid_fkey FOREIGN KEY (departmentid) REFERENCES departments(id);


--
-- Name: employees employees_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY employees
    ADD CONSTRAINT employees_userid_fkey FOREIGN KEY (userid) REFERENCES users(id);


--
-- Name: notifications notifications_fromuser_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT notifications_fromuser_fkey FOREIGN KEY (fromuser) REFERENCES users(id);


--
-- Name: notifications notifications_touser_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY notifications
    ADD CONSTRAINT notifications_touser_fkey FOREIGN KEY (touser) REFERENCES users(id);


--
-- Name: plans plans_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY plans
    ADD CONSTRAINT plans_appid_fkey FOREIGN KEY (appid) REFERENCES apps(id);


--
-- Name: reviewhelpful reviewhelpful_reviewid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY reviewhelpful
    ADD CONSTRAINT reviewhelpful_reviewid_fkey FOREIGN KEY (reviewid) REFERENCES reviews(id);


--
-- Name: reviewhelpful reviewhelpful_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY reviewhelpful
    ADD CONSTRAINT reviewhelpful_userid_fkey FOREIGN KEY (userid) REFERENCES users(id);


--
-- Name: reviews reviews_answerto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY reviews
    ADD CONSTRAINT reviews_answerto_fkey FOREIGN KEY (answerto) REFERENCES reviews(id);


--
-- Name: reviews reviews_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY reviews
    ADD CONSTRAINT reviews_appid_fkey FOREIGN KEY (appid) REFERENCES apps(id);


--
-- Name: reviews reviews_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY reviews
    ADD CONSTRAINT reviews_userid_fkey FOREIGN KEY (userid) REFERENCES users(id);


--
-- Name: speaks speaks_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY speaks
    ADD CONSTRAINT speaks_userid_fkey FOREIGN KEY (userid) REFERENCES users(id);


--
-- Name: usedcompanyplans usedcompanyplans_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY usedcompanyplans
    ADD CONSTRAINT usedcompanyplans_appid_fkey FOREIGN KEY (appid, planid, companyid, planbought) REFERENCES boughtcompanyplans(companyid, appid, planid, datebought);


--
-- Name: usedcompanyplans usedcompanyplans_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY usedcompanyplans
    ADD CONSTRAINT usedcompanyplans_userid_fkey FOREIGN KEY (userid) REFERENCES users(id);


--
-- Name: userbills userbills_appid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY userbills
    ADD CONSTRAINT userbills_appid_fkey FOREIGN KEY (appid) REFERENCES apps(id);


--
-- Name: userbills userbills_planid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY userbills
    ADD CONSTRAINT userbills_planid_fkey FOREIGN KEY (planid) REFERENCES plans(id);


--
-- Name: userbills userbills_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY userbills
    ADD CONSTRAINT userbills_userid_fkey FOREIGN KEY (userid) REFERENCES users(id);


--
-- Name: userrights userrights_companyid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY userrights
    ADD CONSTRAINT userrights_companyid_fkey FOREIGN KEY (companyid) REFERENCES companies(id);


--
-- Name: userrights userrights_departmentid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY userrights
    ADD CONSTRAINT userrights_departmentid_fkey FOREIGN KEY (departmentid) REFERENCES departments(id);


--
-- Name: userrights userrights_userid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY userrights
    ADD CONSTRAINT userrights_userid_fkey FOREIGN KEY (userid) REFERENCES users(id);


--
-- Name: public; Type: ACL; Schema: -; Owner: cloudsqlsuperuser
--

REVOKE ALL ON SCHEMA public FROM cloudsqladmin;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO cloudsqlsuperuser;
GRANT ALL ON SCHEMA public TO PUBLIC;


--
-- PostgreSQL database dump complete
--

