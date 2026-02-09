-- Migration: Add fedwatch column to daily_strategy_log table
-- Execute this in your Supabase SQL Editor

ALTER TABLE daily_strategy_log 
ADD COLUMN IF NOT EXISTS fedwatch JSONB;

COMMENT ON COLUMN daily_strategy_log.fedwatch IS 'FOMC meeting probability data including meeting_date, meeting_name, meeting_time, prob_pause, prob_cut_25, and implied_rate';
