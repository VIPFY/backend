#!/bin/bash

#load .env.test. This has to contain all settings since I ommitted setting default values above
export $(cat .env.test | grep -v ^# | xargs)

echo dropping database
PGPASSWORD=$DB_PW dropdb -U $DB_USER -h $DB_IP -p $DB_PORT $DB_NAME
echo creating database
PGPASSWORD=$DB_PW createdb -U $DB_USER -h $DB_IP -p $DB_PORT $DB_NAME

echo restoring
PGPASSWORD=$DB_PW time psql -U $DB_USER -h $DB_IP -p $DB_PORT $DB_NAME < vipfy_test_dump.sql
echo finished restoring
