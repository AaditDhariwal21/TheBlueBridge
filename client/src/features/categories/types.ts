import type { CategoryColor } from '../../lib/categoryColor';

/** A category as the API sends it (GET /api/categories). */
export interface Category {
  id: string;
  name: string;
  color: CategoryColor;
}
