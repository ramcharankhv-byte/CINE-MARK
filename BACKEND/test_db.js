import { Client } from 'pg';

async function test(url) {
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    console.log("Success:", url);
  } catch (err) {
    console.error("Failed:", url, err.message);
  } finally {
    await client.end();
  }
}

async function run() {
  await test("postgresql://postgres:Ithgf0fdtcEZHgev@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=reference%3Dicmmfmtgptbxmhyzkbam");
  await test("postgresql://postgres:Ithgf0fdtcEZHgev@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=project%3Dicmmfmtgptbxmhyzkbam");
  await test("postgresql://postgres:Ithgf0fdtcEZHgev@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=-c%20project%3Dicmmfmtgptbxmhyzkbam");
  await test("postgresql://postgres:Ithgf0fdtcEZHgev@aws-0-us-east-1.pooler.supabase.com:6543/postgres?options=-c%20reference%3Dicmmfmtgptbxmhyzkbam");
}
run();
