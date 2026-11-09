---
paths:
  - database/seeders/LaravelCloudLoketAndSuperadminSeeder.php
---

# Seeders

## Laravel Cloud Loket and Superadmin seed
Keep this deployment seeder separate from DatabaseSeeder and idempotent by Loket code and Superadmin username. Its approved Elwin account intentionally uses the MPP Loket relationship; resolve it by code, not a hard-coded numeric ID.

## Cloud seeder is create-only
Never overwrite existing records in this production seeder: firstOrCreate Lokets by code and skip the Superadmin entirely when the username exists. Never hard-code a password; generate a random initial password and print it once. A rerun must not reset password, is_active, role, or edited Loket master data.
