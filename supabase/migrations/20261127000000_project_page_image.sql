-- projects.page_image_url: a second, separate image for the project's own
-- page, so the list and the page can each get a picture made for them.
--
-- cover_image_url stays the card image on /projects and the home page, shown
-- in a wide 8:3 band. page_image_url is shown at the top of /projects/[slug]
-- at 16:9. When it is empty the page falls back to the card image, and then
-- to the drawn plate, so existing rows keep working without it.
--
-- Additive and nullable. Table-level grants and RLS policies already cover
-- new columns.

alter table public.projects
  add column page_image_url text;
