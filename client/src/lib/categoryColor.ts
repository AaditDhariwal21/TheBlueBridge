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

/** Light tint: chip and thumbnail backgrounds. */
export const CATEGORY_TINT_BG: Record<CategoryColor, string> = {
  pink: 'bg-category-pink-tint',
  green: 'bg-category-green-tint',
  blue: 'bg-category-blue-tint',
  orange: 'bg-category-orange-tint',
  black: 'bg-category-black-tint',
};

/** Dark ink: thumbnail line art (as `currentColor`). */
export const CATEGORY_INK_TEXT: Record<CategoryColor, string> = {
  pink: 'text-category-pink-ink',
  green: 'text-category-green-ink',
  blue: 'text-category-blue-ink',
  orange: 'text-category-orange-ink',
  black: 'text-category-black-ink',
};

/** A quieter tint: thumbnail backgrounds, so the art never competes with the title. */
export const CATEGORY_TINT_SOFT_BG: Record<CategoryColor, string> = {
  pink: 'bg-category-pink-tint/55',
  green: 'bg-category-green-tint/55',
  blue: 'bg-category-blue-tint/55',
  orange: 'bg-category-orange-tint/55',
  black: 'bg-category-black-tint/55',
};

/** A selected filter chip's border on its tint: a little darker, full colour on hover. */
export const CATEGORY_CHIP_BORDER: Record<CategoryColor, string> = {
  pink: 'border-category-pink/50 hover:border-category-pink',
  green: 'border-category-green/50 hover:border-category-green',
  blue: 'border-category-blue/50 hover:border-category-blue',
  orange: 'border-category-orange/50 hover:border-category-orange',
  black: 'border-category-black/35 hover:border-category-black',
};
