import { CategoryDot } from '../../../components/ui/CategoryDot';
import { applicationRows, type DetailRow } from '../../application/detailsRows';
import { DetailList } from '../../members/components/ProfileDetails';
import { ROLE_LABELS } from '../labels';
import type { Me } from '../types';

/** The facts of an account and her application answers, as a definition list. */
export function AccountSummary({ me, roleLabel }: { me: Me; roleLabel: string }) {
  const rows: DetailRow[] = [
    ['Name', me.name],
    ['Email', me.email ?? '—'],
    ['Mobile', me.phoneNumber],
    ['Occupation', me.occupation],
    [roleLabel, ROLE_LABELS[me.role]],
  ];
  if (me.role === 'ambassador') {
    rows.push([
      'Categories',
      me.categories.length === 0 ? (
        '—'
      ) : (
        <span className="flex flex-wrap gap-x-4 gap-y-1">
          {me.categories.map((category) => (
            <span key={category.id} className="inline-flex items-center gap-1.5">
              <CategoryDot color={category.color} />
              {category.name}
            </span>
          ))}
        </span>
      ),
    ]);
  }
  rows.push(...applicationRows(me));
  return <DetailList rows={rows} />;
}
