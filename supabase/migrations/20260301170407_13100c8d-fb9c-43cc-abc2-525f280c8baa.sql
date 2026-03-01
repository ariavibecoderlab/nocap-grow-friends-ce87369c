
CREATE OR REPLACE FUNCTION public.notify_withdrawal_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when status actually changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Only notify on approved or rejected
  IF NEW.status = 'approved' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'Withdrawal Approved',
      'Your withdrawal request of RM ' || ROUND(NEW.amount, 2) || ' to ' || NEW.bank_name || ' (' || NEW.bank_account_no || ') has been approved.',
      'success',
      '/withdraw'
    );
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.user_id,
      'Withdrawal Rejected',
      'Your withdrawal request of RM ' || ROUND(NEW.amount, 2) || ' was rejected.' || 
        CASE WHEN NEW.rejection_reason IS NOT NULL THEN ' Reason: ' || NEW.rejection_reason ELSE '' END,
      'error',
      '/withdraw'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_withdrawal_status_change
  AFTER UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_withdrawal_status_change();
