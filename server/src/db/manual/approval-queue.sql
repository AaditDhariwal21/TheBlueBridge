-- Pending applications, oldest first (served by users_pending_queue_idx).
-- Run in the Supabase SQL Editor to decide whom to approve.

select u.created_at as applied_at,
       au.email,
       u.name,
       u.occupation,
       u.phone_number,
       u.role as applied_role,
       (select string_agg(c.cat_name, ', ' order by c.cat_name)
        from public.user_categories uc
        join public.categories c on c.cat_id = uc.cat_id
        where uc.user_id = u.user_id) as categories,
       referrer.name as referred_by
from public.users u
join auth.users au on au.id = u.user_id
left join public.referral_codes rc on rc.referral_code_id = u.referral_code_id
left join public.users referrer on referrer.user_id = rc.user_id
where u.status = 'pending'
order by u.created_at, u.user_id;
