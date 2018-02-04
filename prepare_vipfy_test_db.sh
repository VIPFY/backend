#!/bin/bash
echo dropping database
PGPASSWORD=testDatabase dropdb -U vipfy_development -h localhost -p 5433 vipfy_test_database
echo creating database
PGPASSWORD=testDatabase createdb -U vipfy_development -h localhost -p 5433 vipfy_test_database

echo restoring
date
time psql vipfy_test_database < vipfy_test_dump.sql
date
echo finished restoring
