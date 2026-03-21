-- Clean up rickricardojbc@gmail.com (7770d177-3463-48ad-9868-052dc9e9b452) for re-testing
DELETE FROM public.notification_preferences WHERE user_id = '7770d177-3463-48ad-9868-052dc9e9b452';
DELETE FROM public.artist_permissions WHERE user_id = '7770d177-3463-48ad-9868-052dc9e9b452';
DELETE FROM public.team_memberships WHERE user_id = '7770d177-3463-48ad-9868-052dc9e9b452';
DELETE FROM public.profiles WHERE id = '7770d177-3463-48ad-9868-052dc9e9b452';

-- Reset invite links so they can be used again
UPDATE public.invite_links SET used_at = NULL WHERE invitee_email = 'rickricardojbc@gmail.com';