-- Migration: Add business_model column to companies table for Business Model Parametrization
ALTER TABLE companies ADD COLUMN business_model VARCHAR(30) NOT NULL DEFAULT 'MIXED';
