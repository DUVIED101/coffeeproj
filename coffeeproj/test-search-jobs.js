const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zifvfsamfzepxxuxhyhg.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZnZmc2FtZnplcHh4dXhoeWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzAyMDgsImV4cCI6MjA5MDIwNjIwOH0.r7vGB2rqI5PARTVXfRi3P6LdosFrMLluoxMexHDrLKs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSearchJobs() {
  console.log('🧪 Testing search_jobs RPC function...\n');

  // Test 1: Search without any filters
  console.log('Test 1: Search without filters');
  const { data: allJobs, error: error1 } = await supabase.rpc('search_jobs', {
    user_lat: null,
    user_lon: null,
    max_distance_meters: 50000,
    metro_station_filter: null,
    job_type_filter: null,
    equipment_filter: null,
    city_filter: null,
    limit_count: 20,
    offset_count: 0,
  });

  if (error1) {
    console.error('❌ Error:', error1);
  } else {
    console.log(`✅ Found ${allJobs?.length || 0} jobs`);
    if (allJobs && allJobs.length > 0) {
      console.log('First job:', {
        id: allJobs[0].id,
        title: allJobs[0].title,
        status: allJobs[0].status,
        business_name: allJobs[0].business_name,
        branch_name: allJobs[0].branch_name,
      });
    }
  }

  // Test 2: Check jobs table directly
  console.log('\nTest 2: Direct query to jobs table');
  const { data: directJobs, error: error2 } = await supabase
    .from('jobs')
    .select('id, title, status')
    .eq('status', 'open')
    .limit(5);

  if (error2) {
    console.error('❌ Error:', error2);
  } else {
    console.log(`✅ Found ${directJobs?.length || 0} open jobs in jobs table`);
    console.log('Jobs:', directJobs);
  }

  // Test 3: Check if search_jobs function exists
  console.log('\nTest 3: Check if RPC function exists');
  const { data: functions, error: error3 } = await supabase.rpc('search_jobs');

  if (error3) {
    console.log('Error message:', error3.message);
    console.log('Error code:', error3.code);
    console.log('Error details:', error3.details);
  }
}

testSearchJobs()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
