-- Automated withdrawal disbursement tracking
-- Applied 2026-05-31
--
-- Adds disbursement columns to withdrawal_requests and Malaysian IBG code lookup table.
-- Enables: pending → approved → processing → settled | failed (retriable)

ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS disbursement_provider   text,
  ADD COLUMN IF NOT EXISTS disbursement_ref        text,
  ADD COLUMN IF NOT EXISTS disbursement_status     text,
  ADD COLUMN IF NOT EXISTS disbursement_attempts   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disbursement_error      text,
  ADD COLUMN IF NOT EXISTS disbursement_queued_at  timestamptz;

CREATE INDEX IF NOT EXISTS idx_wr_disbursement_queue
  ON withdrawal_requests (status, disbursement_attempts)
  WHERE status IN ('approved', 'processing', 'failed');

CREATE TABLE IF NOT EXISTS bank_ibg_codes (
  bank_name  text PRIMARY KEY,
  ibg_code   text NOT NULL,
  swift_code text
);

INSERT INTO bank_ibg_codes (bank_name, ibg_code, swift_code) VALUES
  ('Maybank',                    'MBB0227',           'MBBEMYKL'),
  ('CIMB Bank',                  'CIMB0223',          'CIBBMYKL'),
  ('Public Bank',                'PBB0233',           'PBBEMYKL'),
  ('RHB Bank',                   'RHB0218',           'RHBBMYKL'),
  ('Hong Leong Bank',            'HLB0224',           'HLBBMYKLXXX'),
  ('AmBank',                     'AMB0232',           'AMBBMYKL'),
  ('Bank Islam',                 'BIMB0340',          'BIMBMYKL'),
  ('Bank Rakyat',                'BKRM0602',          'BKRMMYKL'),
  ('Bank Muamalat',              'BMMB0341',          'BMMBMYKL'),
  ('Affin Bank',                 'AFFINISLAMIC0236',  'AFBQMYKL'),
  ('Alliance Bank',              'ALLIANCE0201',      'MFBBMYKL'),
  ('OCBC Bank',                  'OCBC0229',          'OCBCMYKL'),
  ('HSBC Bank',                  'HSBC0223',          'HBMBMYKL'),
  ('Standard Chartered',         'SCB0216',           'SCBLMYKX'),
  ('UOB Bank',                   'UOB0226',           'UOVBMYKL'),
  ('BSN (Bank Simpanan Nasional)','BSN0601',           'BSNAMYK1'),
  ('Agrobank',                   'AGRO1012',          'AGROMY21')
ON CONFLICT (bank_name) DO NOTHING;
