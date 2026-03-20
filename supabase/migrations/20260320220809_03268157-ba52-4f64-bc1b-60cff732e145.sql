
-- Clean up team data for test team "Slater"
DELETE FROM public.team_memberships WHERE team_id = '0c95e409-cb0d-4736-93e6-de6bc312d2c5';
DELETE FROM public.team_subscriptions WHERE team_id = '0c95e409-cb0d-4736-93e6-de6bc312d2c5';
DELETE FROM public.teams WHERE id = '0c95e409-cb0d-4736-93e6-de6bc312d2c5';

-- Delete applications
DELETE FROM public.team_applications WHERE user_id IN (
  '6f1a2641-a1dd-4c52-b052-7d89981ae457',
  'dbeeafa1-2415-4357-a3af-3c3965013200'
);

-- Delete profiles
DELETE FROM public.profiles WHERE id IN (
  '6f1a2641-a1dd-4c52-b052-7d89981ae457',
  'dbeeafa1-2415-4357-a3af-3c3965013200'
);

-- Delete auth users
DELETE FROM auth.users WHERE id IN (
  '6f1a2641-a1dd-4c52-b052-7d89981ae457',
  'dbeeafa1-2415-4357-a3af-3c3965013200'
);
