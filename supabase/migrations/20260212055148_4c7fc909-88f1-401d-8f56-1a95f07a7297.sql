
-- تصحيح نسب الأبناء الخمسة من 10.29 إلى 10.294118
UPDATE beneficiaries SET share_percentage = 10.294118 WHERE share_percentage = 10.29;

-- تصحيح نسب البنات السبع من 5.15 إلى 5.147059
UPDATE beneficiaries SET share_percentage = 5.147059 WHERE share_percentage = 5.15;
