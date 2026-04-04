-- Check if there are any jobs in the database
SELECT 
  id,
  title,
  job_type,
  status,
  business_id,
  branch_id,
  created_at
FROM jobs
ORDER BY created_at DESC
LIMIT 10;
