-- Supabase Database Trigger for Contact Form Email Forwarding
-- Run this in your Supabase SQL Editor after setting up Edge Functions

-- 1. Create a function to call the Edge Function
CREATE OR REPLACE FUNCTION public.notify_contact_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload JSONB;
  response_status INT;
  response_content TEXT;
BEGIN
  -- Prepare payload for Edge Function
  payload := jsonb_build_object(
    'record_id', NEW.id,
    'name', NEW.name,
    'organization', NEW.organization,
    'email', NEW.email,
    'message', NEW.message,
    'submitted_at', NEW.submitted_at,
    'forward_to', NEW.forwarded_to
  );
  
  -- Call Edge Function (if configured)
  -- Note: Replace 'send-contact-email' with your actual Edge Function name
  BEGIN
    SELECT status, content INTO response_status, response_content
    FROM http_post(
      'https://your-project-ref.supabase.co/functions/v1/send-contact-email',
      payload::text,
      'application/json',
      '{}'::jsonb
    );
    
    -- Update status based on response
    IF response_status = 200 THEN
      NEW.status := 'email_sent';
    ELSE
      NEW.status := 'email_failed';
      RAISE LOG 'Edge Function failed: Status %, Content %', response_status, response_content;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If Edge Function call fails, mark as pending
    NEW.status := 'pending_email';
    RAISE LOG 'Failed to call Edge Function: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- 2. Create the trigger (only if you want automatic email sending via Edge Functions)
-- Uncomment and run if using Supabase Edge Functions
/*
DROP TRIGGER IF EXISTS trigger_notify_contact_submission ON public.contact_submissions;
CREATE TRIGGER trigger_notify_contact_submission
  BEFORE INSERT ON public.contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_contact_submission();
*/

-- 3. Alternative: Simple webhook call (for services like n8n, Zapier, Make.com)
CREATE OR REPLACE FUNCTION public.call_contact_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  webhook_url TEXT;
  payload JSONB;
BEGIN
  -- Get webhook URL from environment (set via Supabase secrets)
  webhook_url := current_setting('app.settings.contact_webhook_url', TRUE);
  
  IF webhook_url IS NOT NULL AND webhook_url != '' THEN
    payload := jsonb_build_object(
      'id', NEW.id,
      'name', NEW.name,
      'organization', NEW.organization,
      'email', NEW.email,
      'message', NEW.message,
      'submitted_at', NEW.submitted_at,
      'forward_to', NEW.forwarded_to,
      'status', NEW.status
    );
    
    BEGIN
      PERFORM net.http_post(
        url := webhook_url,
        body := payload::text,
        headers := '{"Content-Type": "application/json"}'::jsonb
      );
      
      -- Update status
      NEW.status := 'webhook_sent';
    EXCEPTION WHEN OTHERS THEN
      NEW.status := 'webhook_failed';
      RAISE LOG 'Webhook call failed: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Create webhook trigger (for automation services)
-- Uncomment and run if using webhook automation
/*
DROP TRIGGER IF EXISTS trigger_call_contact_webhook ON public.contact_submissions;
CREATE TRIGGER trigger_call_contact_webhook
  BEFORE INSERT ON public.contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.call_contact_webhook();
*/

-- 5. Set webhook URL as a database secret (run in Supabase SQL Editor)
-- SELECT set_config('app.settings.contact_webhook_url', 'https://hooks.zapier.com/hooks/catch/...', false);

-- 6. View recent contact submissions
CREATE OR REPLACE VIEW public.contact_submissions_view AS
SELECT 
  id,
  name,
  organization,
  email,
  submitted_at,
  status,
  CASE 
    WHEN status = 'email_sent' THEN '✅ Email sent'
    WHEN status = 'webhook_sent' THEN '✅ Forwarded via webhook'
    WHEN status = 'pending_email' THEN '⏳ Pending email configuration'
    WHEN status = 'email_failed' THEN '❌ Email failed'
    WHEN status = 'webhook_failed' THEN '❌ Webhook failed'
    ELSE '📝 Received'
  END as status_display,
  forwarded_to
FROM public.contact_submissions
ORDER BY submitted_at DESC;

-- Grant access to appropriate roles
GRANT SELECT ON public.contact_submissions_view TO authenticated;
GRANT SELECT ON public.contact_submissions_view TO service_role;