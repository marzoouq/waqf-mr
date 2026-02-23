
-- إضافة قيمة accountant إلى نوع app_role (يجب أن تكون في migration منفصلة)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';
