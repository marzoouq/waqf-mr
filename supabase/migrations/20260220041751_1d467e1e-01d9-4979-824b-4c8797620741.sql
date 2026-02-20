-- Update waqf-assets bucket to allow TTF font files
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'font/ttf', 'application/x-font-ttf', 'application/octet-stream']
WHERE id = 'waqf-assets';