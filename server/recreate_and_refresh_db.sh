#!/usr/bin/env bash
node dev_scripts/local_db_dev/local_db_delete_all.js
node dev_scripts/local_db_dev/local_db_table_creator.js
node dev_scripts/local_db_dev/local_db_synchronizer.js
