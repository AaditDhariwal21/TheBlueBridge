import { SearchFilterBar } from '../../../../components/ui/SearchFilterBar';
import { useCategories } from '../../../categories/useCategories';
import { FEED_SEARCH_RULES } from '../../model/validation';

interface FeedSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  categoryIds: string[];
  onCategoriesChange: (ids: string[]) => void;
}

/** Search and "Filter by category" above the Feed (the same bar as the member directory's). */
export function FeedSearchBar({
  query,
  onQueryChange,
  categoryIds,
  onCategoriesChange,
}: FeedSearchBarProps) {
  const categories = useCategories();
  return (
    <SearchFilterBar
      label="Blogs"
      placeholder="Search blogs"
      hint={`Results update as you type, from ${FEED_SEARCH_RULES.queryMin} characters.`}
      maxLength={FEED_SEARCH_RULES.queryMax}
      query={query}
      onQueryChange={onQueryChange}
      filter={{
        label: 'Filter by category',
        shortLabel: 'Filter',
        title: 'Categories',
        options:
          categories.status === 'ready'
            ? categories.categories.map((c) => ({ id: c.id, label: c.name, color: c.color }))
            : categories.status,
        onRetry: categories.retry,
        value: categoryIds,
        onChange: onCategoriesChange,
        max: FEED_SEARCH_RULES.maxCategories,
      }}
    />
  );
}
