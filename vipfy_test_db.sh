#! /bin/bash
dropdb test_database
createdb test_database
psql test_database < dump_db.sql
