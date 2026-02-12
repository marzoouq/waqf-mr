
-- توسيع دقة عمود share_percentage إلى 6 خانات عشرية
ALTER TABLE beneficiaries ALTER COLUMN share_percentage TYPE numeric(12,6);

-- تصحيح نسب الأبناء الخمسة
UPDATE beneficiaries SET share_percentage = 10.294118 WHERE share_percentage = 10.29;

-- تصحيح نسب البنات السبع
UPDATE beneficiaries SET share_percentage = 5.147059 WHERE share_percentage = 5.15;
