const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  
  if (!fs.existsSync(envPath)) {
    console.error(' .env.local file not found!');
    process.exit(1);
  }

  const envFile = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envFile.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return envVars;
}

const env = loadEnvFile();

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const engines = ['ChatGPT', 'Gemini', 'Claude', 'Perplexity'];

const keywords = [
  'AI search optimization',
  'machine learning tools',
  'data analytics platform',
  'business intelligence software',
  'AI automation tools',
  'predictive analytics',
  'deep learning frameworks',
  'natural language processing',
  'computer vision solutions',
  'AI model deployment',
  'neural network architecture',
  'reinforcement learning',
  'AI cloud services',
  'data science platform',
  'AI ethics and governance'
];

const snippets = [
  'Leading provider of AI-powered solutions for enterprise analytics and automation.',
  'Comprehensive platform offering machine learning tools and data insights.',
  'Industry-standard framework for building and deploying AI models at scale.',
  'Innovative solutions for business intelligence and predictive analytics.',
  'Advanced AI tools enabling automated decision-making and optimization.',
];

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function seed() {
  try {
    console.log(' Starting seed process...\n');

    // Check if engines exist, if not insert them
    const { data: existingEngines } = await supabase.from('engines').select('*');
    
    if (!existingEngines || existingEngines.length === 0) {
      console.log(' Inserting engines...');
      const { error: engineError } = await supabase.from('engines').insert(
        engines.map((name, idx) => ({ id: idx + 1, name }))
      );
      if (engineError) {
        console.error('Engine insert error:', engineError);
        return;
      }
      console.log(' Engines inserted\n');
    }

    // Try to get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    let currentUser = user;

    // If no user, ask for login credentials
    if (!currentUser) {
      console.log(' No active session found.\n');
      console.log('Please enter your credentials:\n');
      
      const email = await askQuestion('Email: ');
      const password = await askQuestion('Password: ');

      console.log('\n Signing in...');
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (signInError) {
        console.error(' Sign in failed:', signInError.message);
        console.log('\n If you don\'t have an account:');
        console.log('   1. Go to http://localhost:3000');
        console.log('   2. Sign up');
        console.log('   3. Run this script again');
        return;
      }

      currentUser = authData.user;
      console.log(' Signed in successfully!\n');
    }

    console.log(' User:', currentUser.email || currentUser.id);

    // Create or get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (!profile) {
      console.log(' Creating profile...');
      const { error: profileError } = await supabase.from('profiles').insert({
        id: currentUser.id,
        full_name: 'Demo User'
      });
      
      if (profileError) {
        console.error('Profile error:', profileError);
      }
    }

    // Check if project already exists
    const { data: existingProjects } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', currentUser.id);

    if (existingProjects && existingProjects.length > 0) {
      console.log('\n  You already have a project!');
      console.log('Project:', existingProjects[0].name);
      console.log('\n  Delete it first if you want to reseed.');
      console.log('Or go to http://localhost:3000/dashboard to view your data.\n');
      return;
    }

    // Create project
    console.log(' Creating project...');
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        owner_id: currentUser.id,
        name: 'My AI Product',
        domain: 'myaiproduct.com'
      })
      .select()
      .single();

    if (projectError) {
      console.error(' Project error:', projectError);
      return;
    }

    console.log(' Project created:', project.id);

    // Insert keywords
    console.log(' Inserting keywords...');
    const keywordInserts = keywords.map(kw => ({
      project_id: project.id,
      keyword: kw
    }));

    const { data: insertedKeywords, error: kwError } = await supabase
      .from('keywords')
      .insert(keywordInserts)
      .select();

    if (kwError) {
      console.error(' Keyword error:', kwError);
      return;
    }

    console.log(` Inserted ${insertedKeywords.length} keywords`);

    // Generate 14 days of check data
console.log(' Generating check data for 14 days...');
const checks = [];
const now = new Date();

for (let day = 13; day >= 0; day--) {
  const checkDate = new Date(now);
  checkDate.setDate(checkDate.getDate() - day);

  for (const keyword of insertedKeywords) {
    for (let engineId = 1; engineId <= 4; engineId++) {
      const presence = Math.random() > 0.2; // 80% presence rate
      const position = presence ? Math.floor(Math.random() * 10) + 1 : null;
      const citationsCount = presence ? Math.floor(Math.random() * 5) + 1 : 0;

      checks.push({
        project_id: project.id,
        keyword_id: keyword.id,
        engine_id: engineId,
        position,
        presence,
        answer_snippet: presence ? snippets[Math.floor(Math.random() * snippets.length)] : null,
        citations_count: citationsCount,
        observed_urls: presence ? [project.domain] : null,  // ← CHANGED THIS LINE
        timestamp: checkDate.toISOString(),
        created_at: checkDate.toISOString()
      });
    }
  }
}

    // Insert in batches
    console.log(` Inserting ${checks.length} checks in batches...`);
    const batchSize = 100;
    let successCount = 0;

    for (let i = 0; i < checks.length; i += batchSize) {
      const batch = checks.slice(i, i + batchSize);
      const { error: checkError } = await supabase.from('checks').insert(batch);
      
      if (checkError) {
        console.error(' Check insert error:', checkError);
      } else {
        successCount += batch.length;
        console.log(` Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(checks.length / batchSize)} (${batch.length} records)`);
      }
    }

    console.log('\n Seed complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(` Project: ${project.name}`);
    console.log(` Keywords: ${insertedKeywords.length}`);
    console.log(` Days: 14`);
    console.log(` Checks inserted: ${successCount}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n Go to http://localhost:3000/dashboard to view your data!\n');
    
  } catch (error) {
    console.error(' Seed error:', error);
  } finally {
    process.exit(0);
  }
}

seed();