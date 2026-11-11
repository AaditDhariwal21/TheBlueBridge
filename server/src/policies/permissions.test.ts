import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { USER_STATUSES, type UserRole, type UserStatus } from '../db/schema.ts';
import {
  canComment,
  canCreateQueryBlog,
  canModerate,
  canPostQuery,
  canReplyUnderQuery,
  canViewAllReferrals,
  canWriteBlog,
  isApproved,
  type ScopedActor,
} from './permissions.ts';

const TECH = 'cat-tech';
const FINANCE = 'cat-finance';
const LEGAL = 'cat-legal';

function actor(
  role: UserRole,
  options: { status?: UserStatus; categoryIds?: string[]; id?: string } = {},
): ScopedActor {
  return {
    id: options.id ?? `user-${role}`,
    role,
    status: options.status ?? 'approved',
    categoryIds: options.categoryIds ?? [],
  };
}

const member = actor('member');
const ambassador = actor('ambassador', { categoryIds: [TECH, FINANCE] });
const admin = actor('admin');
const NOT_APPROVED = USER_STATUSES.filter((s) => s !== 'approved');

describe('isApproved', () => {
  it('is true only for approved accounts', () => {
    assert.equal(isApproved(member), true);
    assert.equal(isApproved(null), false);
    for (const status of NOT_APPROVED) assert.equal(isApproved(actor('admin', { status })), false);
  });
});

describe('participation (blogs, comments, queries)', () => {
  const checks = { canWriteBlog, canComment, canPostQuery };

  for (const [name, check] of Object.entries(checks)) {
    it(`${name}: every approved role may`, () => {
      for (const a of [member, ambassador, admin]) assert.equal(check(a), true, a.role);
    });

    it(`${name}: visitors and non-approved accounts may not`, () => {
      assert.equal(check(null), false);
      for (const status of NOT_APPROVED) {
        for (const role of ['member', 'ambassador', 'admin'] as const) {
          assert.equal(
            check(actor(role, { status, categoryIds: [TECH] })),
            false,
            `${role}/${status}`,
          );
        }
      }
    });
  }
});

describe('canReplyUnderQuery', () => {
  const techQuery = { authorId: 'someone-else', categoryId: TECH };

  it('lets a member reply only under their own query', () => {
    assert.equal(canReplyUnderQuery(member, techQuery), false);
    assert.equal(canReplyUnderQuery(member, { ...techQuery, authorId: member.id }), true);
  });

  it('lets an ambassador answer in their own categories only', () => {
    assert.equal(canReplyUnderQuery(ambassador, techQuery), true);
    assert.equal(canReplyUnderQuery(ambassador, { ...techQuery, categoryId: LEGAL }), false);
  });

  it('lets an ambassador reply under their own query outside their categories', () => {
    const ownLegalQuery = { authorId: ambassador.id, categoryId: LEGAL };
    assert.equal(canReplyUnderQuery(ambassador, ownLegalQuery), true);
  });

  it('lets an admin answer in any category', () => {
    assert.equal(canReplyUnderQuery(admin, { ...techQuery, categoryId: LEGAL }), true);
  });

  it('gives no power before approval, even to the query author', () => {
    const pendingAuthor = actor('member', { status: 'pending', id: 'author' });
    assert.equal(canReplyUnderQuery(pendingAuthor, { ...techQuery, authorId: 'author' }), false);
    const pendingAmbassador = actor('ambassador', { status: 'pending', categoryIds: [TECH] });
    assert.equal(canReplyUnderQuery(pendingAmbassador, techQuery), false);
    assert.equal(canReplyUnderQuery(null, techQuery), false);
  });
});

describe('canModerate', () => {
  it('never lets a member moderate', () => {
    assert.equal(canModerate(member, [TECH]), false);
  });

  it('lets an ambassador moderate a blog with any one matching tag', () => {
    assert.equal(canModerate(ambassador, [LEGAL, FINANCE]), true);
    assert.equal(canModerate(ambassador, [TECH]), true);
  });

  it('stops an ambassador outside their categories', () => {
    assert.equal(canModerate(ambassador, [LEGAL]), false);
    assert.equal(canModerate(ambassador, []), false);
  });

  it('stops an ambassador who has no categories', () => {
    assert.equal(canModerate(actor('ambassador'), [TECH]), false);
  });

  it('lets an admin moderate anything', () => {
    assert.equal(canModerate(admin, [LEGAL]), true);
    assert.equal(canModerate(admin, []), true);
  });

  it('gives no power before approval', () => {
    for (const status of NOT_APPROVED) {
      assert.equal(canModerate(actor('admin', { status }), [TECH]), false);
      assert.equal(
        canModerate(actor('ambassador', { status, categoryIds: [TECH] }), [TECH]),
        false,
      );
    }
  });
});

describe('canCreateQueryBlog', () => {
  it('is for approved admins only', () => {
    assert.equal(canCreateQueryBlog(admin), true);
    assert.equal(canCreateQueryBlog(actor('admin', { status: 'pending' })), false);
  });

  it('refuses ambassadors, even in their own categories, members and visitors', () => {
    assert.equal(canCreateQueryBlog(ambassador), false);
    assert.equal(canCreateQueryBlog(member), false);
    assert.equal(canCreateQueryBlog(null), false);
  });
});

describe('canViewAllReferrals', () => {
  it('is for approved admins only', () => {
    assert.equal(canViewAllReferrals(admin), true);
    assert.equal(canViewAllReferrals(ambassador), false);
    assert.equal(canViewAllReferrals(member), false);
    assert.equal(canViewAllReferrals(actor('admin', { status: 'suspended' })), false);
    assert.equal(canViewAllReferrals(null), false);
  });
});
