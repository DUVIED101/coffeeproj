const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zifvfsamfzepxxuxhyhg.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZnZmc2FtZnplcHh4dXhoeWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzAyMDgsImV4cCI6MjA5MDIwNjIwOH0.r7vGB2rqI5PARTVXfRi3P6LdosFrMLluoxMexHDrLKs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDetailed() {
  console.log('🔍 Detailed investigation...\n');

  // Check jobs with JOIN
  console.log('1. Jobs with JOIN to businesses and branches:');
  const { data: jobsWithJoin, error: error1 } = await supabase
    .from('jobs')
    .select(
      `
      *,
      businesses!inner(name),
      branches!inner(name, metro_station)
    `
    )
    .eq('status', 'open');

  console.log('Error:', error1);
  console.log('Count:', jobsWithJoin?.length);
  if (jobsWithJoin && jobsWithJoin.length > 0) {
    console.log('First job structure:', JSON.stringify(jobsWithJoin[0], null, 2));
  }

  // Check if jobs have geopoint
  console.log('\n2. Check if jobs have geopoint:');
  const { data: jobsGeo, error: error2 } = await supabase
    .from('jobs')
    .select('id, title, geopoint, location')
    .eq('status', 'open');

  console.log('Error:', error2);
  if (jobsGeo) {
    jobsGeo.forEach(job => {
      console.log(`Job "${job.title}": geopoint=${job.geopoint}, location=${JSON.stringify(job.location)}`);
    });
  }

  // Check branches
  console.log('\n3. Check branches:');
  const { data: branches, error: error3 } = await supabase.from('branches').select('*');

  console.log('Error:', error3);
  console.log('Branches count:', branches?.length);
  if (branches && branches.length > 0) {
    console.log('First branch:', JSON.stringify(branches[0], null, 2));
  }

  // Check businesses
  console.log('\n4. Check businesses:');
  const { data: businesses, error: error4 } = await supabase.from('businesses').select('*');

  console.log('Error:', error4);
  console.log('Businesses count:', businesses?.length);
  if (businesses && businesses.length > 0) {
    console.log('First business:', JSON.stringify(businesses[0], null, 2));
  }

  // Try search_jobs with actual job data
  if (jobsWithJoin && jobsWithJoin.length > 0) {
    const firstJob = jobsWithJoin[0];
    console.log('\n5. Test search_jobs RPC:');

    const { data: searchResult, error: error5 } = await supabase.rpc('search_jobs', {
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

    console.log('RPC Error:', error5);
    console.log('RPC Result count:', searchResult?.length);
    if (error5) {
      console.log('Error details:', JSON.stringify(error5, null, 2));
    }
    if (searchResult && searchResult.length > 0) {
      console.log('First result:', JSON.stringify(searchResult[0], null, 2));
    }
  }
}

testDetailed()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
