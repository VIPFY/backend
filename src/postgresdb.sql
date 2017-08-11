Create Type userstatus AS ENUM ('toverify', 'normal', 'banned', 'onlynews');

Create Table users (
	id serial primary key,
	email varchar(50) UNIQUE NOT NULL,
	passwordhash char(66),
	status userstatus NOT NULL DEFAULT 'toverify',
	firstname varchar(40),
	middlename varchar(40),
	lastname varchar(40),
	title varchar(20),
	sex char(1),
	birthday date,
	recoveryemail varchar(50),
	handynumber varchar(20),
	telefonnumber varchar(20),
	addresscountry varchar(20),
	addressstate varchar(20),
	addresscity varchar(20),
	addressstreet varchar(20),
	addressnumber smallint,
	profilpicture varchar(50),
	lastactive timestamp,
	lastsecret char(66),
	riskvalue smallint,
	newsletter boolean DEFAULT FALSE,
	referall smallint DEFAULT 0,
	cobranded smallint DEFAULT 0,
	resetoption smallint DEFAULT 0
);

CREATE TYPE languages AS ENUM ('English');

Create Table speaks (
	userid integer REFERENCES users(id) ON DELETE CASCADE,
	language languages DEFAULT 'English',
	preferred boolean DEFAULT FALSE,
	PRIMARY KEY (userid, language)
);

CREATE TABLE companies (
	id serial PRIMARY KEY,
	name varchar(40),
	companylogo varchar(50),
	addresscountry varchar(20),
	addressstate varchar(20),
	addresscity varchar(20),
	addressstreet varchar(20),
	addressnumber smallint
);

CREATE TABLE departments (
	companyid integer REFERENCES companies(id),
	departmentid serial,
	name varchar(40),
	addresscountry varchar(20),
	addressstate varchar(20),
	addresscity varchar(20),
	addressstreet varchar(20),
	addressnumber smallint,
	PRIMARY KEY (companyid, departmentid)
);

CREATE TABLE employees (
	companyid integer,
	departmentid integer,
	userid integer REFERENCES users(id),
	begindate date DEFAULT CURRENT_DATE,
	enddate date,
	position varchar(20),
	FOREIGN KEY (companyid,departmentid) REFERENCES departments (companyid,departmentid),
	PRIMARY KEY (companyid,departmentid,userid,begindate)
);

CREATE TABLE developers (
	id serial PRIMARY KEY,
	name varchar(40),
	website varchar(50),
	supportwebsite varchar(50),
	supportphone varchar(20),
	legalwebsite varchar(50),
	bankaccount varchar(30)
);

CREATE TABLE apps (
	id serial PRIMARY KEY,
	developerid integer REFERENCES developers(id),
	name varchar(40),
	percentage smallint,
	description text,
	applogo varchar(50),
	versionnumber varchar(10),
	updatedate date
);

Create Table appimages (
	id serial PRIMARY KEY,
	appid integer REFERENCES apps(id),
	link varchar(50),
	sequence smallint
);

CREATE TABLE reviews (
	userid integer REFERENCES users(id),
	appid integer REFERENCES apps(id),
	reviewdate date,
	stars smallint,
	reviewtext text,
	PRIMARY KEY (userid, appid, reviewdate)
);

CREATE TABLE reviewhelpful (
	writeruserid integer,
	appid integer,
	reviewdate date,
	helpfuluserid integer REFERENCES users(id),
	good boolean,
	FOREIGN KEY (writeruserid, appid, reviewdate) REFERENCES reviews (userid, appid, reviewdate),
	PRIMARY KEY (writeruserid, appid, reviewdate, helpfuluserid)
);

#payingoptions

#permission

#appcosts

#appsbought

#notifications