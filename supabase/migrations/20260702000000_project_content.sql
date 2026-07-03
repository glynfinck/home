-- Long-form MDX write-up for project detail pages (/projects/[slug]).
-- Table-level select grants from the init migration cover new columns.
alter table public.projects add column content text;
