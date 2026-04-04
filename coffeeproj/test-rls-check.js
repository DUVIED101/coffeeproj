const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zifvfsamfzepxxuxhyhg.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZnZmc2FtZnplcHh4dXhoeWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzAyMDgsImV4cCI6MjA5MDIwNjIwOH0.r7vGB2rqI5PARTVXfRi3P6LdosFrMLluoxMexHDrLKs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRLS() {
  console.log('🔍 Checking RLS policies and data integrity...\n');

  // 1. Check jobs - what business_id and branch_id do they reference?
  console.log('1. Check jobs with their foreign keys:');
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, title, business_id, branch_id, business_owner_id, status')
    .eq('status', 'open');

  if (jobsError) {
    console.error('❌ Error fetching jobs:', jobsError);
  } else {
    console.log(`✅ Found ${jobs?.length} open jobs`);
    jobs?.forEach(job => {
      console.log(`  - "${job.title}": business_id=${job.business_id}, branch_id=${job.branch_id}, owner_id=${job.business_owner_id}`);
    });
  }

  if (jobs && jobs.length > 0) {
    const firstJob = jobs[0];

    // 2. Try to fetch the business directly by ID
    console.log(`\n2. Try to fetch business with ID: ${firstJob.business_id}`);
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', firstJob.business_id)
      .maybeSingle();

    if (businessError) {
      console.error('❌ Error fetching business:', businessError);
    } else if (!business) {
      console.log('❌ Business not found - it may have been deleted or RLS blocks access');
    } else {
      console.log('✅ Business found:', business);
    }

    // 3. Try to fetch the branch directly by ID
    console.log(`\n3. Try to fetch branch with ID: ${firstJob.branch_id}`);
    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('*')
      .eq('id', firstJob.branch_id)
      .maybeSingle();

    if (branchError) {
      console.error('❌ Error fetching branch:', branchError);
    } else if (!branch) {
      console.log('❌ Branch not found - it may have been deleted or RLS blocks access');
    } else {
      console.log('✅ Branch found:', branch);
    }

    // 4. Check all businesses without filters
    console.log('\n4. Check ALL businesses (no filters):');
    const { data: allBusinesses, error: allBusinessesError, count } = await supabase
      .from('businesses')
      .select('*', { count: 'exact' });

    if (allBusinessesError) {
      console.error('❌ Error:', allBusinessesError);
    } else {
      console.log(`Total businesses: ${count}`);
      console.log(`Data returned: ${allBusinesses?.length}`);
    }

    // 5. Check all branches without filters
    console.log('\n5. Check ALL branches (no filters):');
    const { data: allBranches, error: allBranchesError, count: branchCount } = await supabase
      .from('branches')
      .select('*', { count: 'exact' });

    if (allBranchesError) {
      console.error('❌ Error:', allBranchesError);
    } else {
      console.log(`Total branches: ${branchCount}`);
      console.log(`Data returned: ${allBranches?.length}`);
    }

    // 6. Check users
    console.log('\n6. Check users (business owners):');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, account_type')
      .eq('account_type', 'business');

    if (usersError) {
      console.error('❌ Error:', usersError);
    } else {
      console.log(`✅ Found ${users?.length} business users`);
      users?.forEach(user => {
        console.log(`  - ${user.email} (${user.id})`);
      });
    }
  }

  console.log('\n📊 Summary:');
  console.log('If businesses/branches are not found but jobs reference them,');
  console.log('the data was likely deleted or RLS policies are blocking access.');
  console.log('Check Supabase Dashboard > Table Editor to see the actual data.');
}

checkRLS()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
