-- 0005_category_colors.sql
-- Every category has a colour, shown as a small dot wherever the category appears.
-- Stored as a named palette entry, never a hex value: the frontend maps each name to
-- a design token (client/src/styles/tokens.css), so the brand palette stays in one place.

create type public.category_color as enum ('pink', 'green', 'blue', 'orange', 'black');

-- Existing rows get 'blue' only so the column can be NOT NULL; the seed script
-- (npm run db:seed -w server) then sets each category's real colour.
alter table public.categories
  add column color public.category_color not null default 'blue';
alter table public.categories
  alter column color drop default;
