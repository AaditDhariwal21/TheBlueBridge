/**
 * A category's colour, exactly as the API sends it (public.category_color).
 * Each maps to one design token in styles/tokens.css. Full class names are
 * spelled out so Tailwind can find them.
 */
export type CategoryColor = 'pink' | 'green' | 'blue' | 'orange' | 'black';

export const CATEGORY_BG: Record<CategoryColor, string> = {
  pink: 'bg-category-pink',
  green: 'bg-category-green',
  blue: 'bg-category-blue',
  orange: 'bg-category-orange',
  black: 'bg-category-black',
};

export const CATEGORY_TEXT: Record<CategoryColor, string> = {
  pink: 'text-category-pink',
  green: 'text-category-green',
  blue: 'text-category-blue',
  orange: 'text-category-orange',
  black: 'text-category-black',
};
