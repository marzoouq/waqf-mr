CREATE TABLE public.archived_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description     text CHECK (description IS NULL OR char_length(description) <= 500),
  category        text NOT NULL CHECK (category IN (
    'meeting_minutes','annual_reports','certificates',
    'official_contracts','correspondence','other'
  )),
  storage_path    text NOT NULL UNIQUE,
  file_size_bytes integer NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
  mime_type       text NOT NULL DEFAULT 'application/pdf' CHECK (mime_type = 'application/pdf'),
  document_date   date,
  is_published    boolean NOT NULL DEFAULT true,
  uploaded_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.archived_documents TO authenticated;
GRANT ALL ON public.archived_documents TO service_role;

ALTER TABLE public.archived_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_archived_docs_cat_pub_date
  ON public.archived_documents (category, is_published, document_date DESC NULLS LAST, created_at DESC);

CREATE TRIGGER trg_archived_docs_updated_at
  BEFORE UPDATE ON public.archived_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY archived_docs_select_admin ON public.archived_documents
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'accountant'::app_role));

CREATE POLICY archived_docs_select_published ON public.archived_documents
  FOR SELECT TO authenticated
  USING (
    is_published = true
    AND (has_role(auth.uid(),'beneficiary'::app_role) OR has_role(auth.uid(),'waqif'::app_role))
  );

CREATE POLICY archived_docs_insert_admin ON public.archived_documents
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY archived_docs_update_admin ON public.archived_documents
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY archived_docs_delete_admin ON public.archived_documents
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));