-- Chart payloads (`<Chart src="…json" />`) live in the public `media` bucket
-- alongside images and PDFs, so a figure can be published without a redeploy.
--
-- Existing media storage policies apply unchanged: public read, admin-only
-- writes. The payloads are the same data the rendered chart shows, so there is
-- nothing here that isn't already on the page.
update storage.buckets
set allowed_mime_types = array[
  'image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif',
  'image/svg+xml',
  'application/pdf',
  'application/json'
]
where id = 'media';
