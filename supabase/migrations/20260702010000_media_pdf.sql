-- Resume downloads live in the public `media` bucket alongside images.
-- Existing media storage policies (public read, admin-only writes) apply.
update storage.buckets
set allowed_mime_types = array[
  'image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif',
  'image/svg+xml',
  'application/pdf'
]
where id = 'media';
