-- Migration: Rename business_model column to operational_profile in companies table
ALTER TABLE companies RENAME COLUMN business_model TO operational_profile;
