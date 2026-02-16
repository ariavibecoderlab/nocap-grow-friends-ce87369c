-- Add is_sandbox column to api_applications
ALTER TABLE public.api_applications 
ADD COLUMN is_sandbox BOOLEAN NOT NULL DEFAULT false;

-- Update the api_charges table to include a sandbox flag for easier filtering
ALTER TABLE public.api_charges
ADD COLUMN is_sandbox BOOLEAN NOT NULL DEFAULT false;
