-- Create Core Core Profile Tables
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    stripe_account_id TEXT,
    payout_status TEXT DEFAULT 'unlinked',
    identity_status TEXT DEFAULT 'pending', 
    background_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Active Job Postings Matrix
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id UUID REFERENCES public.profiles(id),
    title TEXT NOT NULL,
    industry TEXT NOT NULL,
    geofence_lat NUMERIC(10, 7),
    geofence_lng NUMERIC(10, 7),
    geofence_radius_meters INT DEFAULT 200,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Operational Job Orders
CREATE TABLE public.job_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    geofence_lat NUMERIC(10, 7),
    geofence_lng NUMERIC(10, 7),
    geofence_radius_meters INT DEFAULT 200,
    status TEXT DEFAULT 'open'
);

-- Work Logging and Verification Schema
CREATE TABLE public.work_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_order_id UUID REFERENCES public.job_orders(id),
    worker_id UUID REFERENCES public.profiles(id),
    work_date DATE NOT NULL,
    hours_worked NUMERIC(4,2),
    gross_amount NUMERIC(10,2),
    payment_status TEXT DEFAULT 'pending',
    approved_by_employer BOOLEAN DEFAULT false
);

-- Dynamic Category Compliance Configuration Management
CREATE TABLE public.compliance_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry TEXT NOT NULL,
    country TEXT NOT NULL,
    state_province TEXT,
    required_document_types TEXT[] NOT NULL
);

CREATE TABLE public.worker_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending'
);

-- Financial Transaction Ledgers
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id),
    employer_id UUID REFERENCES public.profiles(id),
    worker_id UUID REFERENCES public.profiles(id),
    gross_amount NUMERIC(10,2),
    fee_amount NUMERIC(10,2),
    net_amount NUMERIC(10,2),
    fee_rate NUMERIC(4,2)
);

-- Legal Compliance Tracking Tables
CREATE TABLE public.legal_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_string TEXT NOT NULL,
    user_role TEXT NOT NULL,
    agreement_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE public.user_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    agreement_id UUID REFERENCES public.legal_agreements(id),
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- =========================================================================
-- SYSTEM AUTOMATION TRIGGERS & PROCEDURES
-- =========================================================================

-- 1. Automate Legal Deactivation Flow
CREATE OR REPLACE FUNCTION public.auto_deprecate_old_legal_versions()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.legal_agreements SET is_active = false WHERE user_role = NEW.user_role AND id <> NEW.id;
  NEW.is_active := true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_auto_deprecate_old_legal_versions
  BEFORE INSERT ON public.legal_agreements FOR EACH ROW EXECUTE FUNCTION public.auto_deprecate_old_legal_versions();

-- 2. Financial Ledger Processing Split Modeling
CREATE OR REPLACE FUNCTION public.record_hire_transaction(_application_id UUID, _job_id UUID, _employer_id UUID, _worker_id UUID, _gross_amount NUMERIC)
RETURNS VOID AS $$
DECLARE
  _industry TEXT; _fee_rate NUMERIC; _fee_amount NUMERIC; _net_amount NUMERIC;
BEGIN
  SELECT industry INTO _industry FROM public.jobs WHERE id = _job_id;
  _fee_rate := CASE _industry
    WHEN 'Healthcare' THEN 0.15 WHEN 'Logistics & Warehousing' THEN 0.12 WHEN 'Hospitality & Catering' THEN 0.14 WHEN 'Retail & E-commerce' THEN 0.10 WHEN 'Construction & Facilities' THEN 0.13 ELSE 0.10
  END;
  _fee_amount := ROUND(_gross_amount * _fee_rate, 2);
  _net_amount := _gross_amount - _fee_amount;
  INSERT INTO public.transactions (job_id, employer_id, worker_id, gross_amount, fee_amount, net_amount, fee_rate)
  VALUES (_job_id, _employer_id, _worker_id, _gross_amount, _fee_amount, _net_amount, _fee_rate);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. IRS 1099 Threshold Enforcement Engine
CREATE OR REPLACE FUNCTION public.enforce_1099_compliance()
RETURNS TRIGGER AS $$
DECLARE _total_earnings NUMERIC; _w9_verified BOOLEAN;
BEGIN
  IF NEW.approved_by_employer = TRUE AND (OLD.approved_by_employer = FALSE OR OLD.approved_by_employer IS NULL) THEN
    SELECT COALESCE(SUM(gross_amount), 0) INTO _total_earnings FROM public.work_logs
    WHERE worker_id = NEW.worker_id AND approved_by_employer = TRUE AND EXTRACT(YEAR FROM work_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    _total_earnings := _total_earnings + COALESCE(NEW.gross_amount, 0);
    IF _total_earnings >= 550.00 THEN
      SELECT EXISTS (SELECT 1 FROM public.worker_documents WHERE user_id = NEW.worker_id AND doc_type = 'W9' AND status = 'verified') INTO _w9_verified;
      IF NOT _w9_verified THEN
        RAISE EXCEPTION '1099 Compliance Threshold Breach. Action halted until W-9 verified.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_enforce_1099_compliance BEFORE UPDATE ON public.work_logs FOR EACH ROW EXECUTE FUNCTION public.enforce_1099_compliance();

-- 4. Set-and-Forget Auto Approval Loop
CREATE OR REPLACE FUNCTION public.auto_approve_verified_shifts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'pending' AND NEW.hours_worked IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.worker_id AND identity_status = 'verified' AND background_status = 'clear') THEN
      NEW.approved_by_employer := TRUE;
      NEW.payment_status := 'approved';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_auto_approve_verified_shifts BEFORE INSERT ON public.work_logs FOR EACH ROW EXECUTE FUNCTION public.auto_approve_verified_shifts();
  
