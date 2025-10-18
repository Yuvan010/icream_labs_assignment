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

async function cleanup() {
  try {
    console.log('  Starting cleanup process...\n');

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
        return;
      }

      currentUser = authData.user;
      console.log(' Signed in successfully!\n');
    }

    console.log(' User:', currentUser.email || currentUser.id);

    // Get all projects for this user
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', currentUser.id);

    if (projectError) {
      console.error(' Error fetching projects:', projectError);
      return;
    }

    if (!projects || projects.length === 0) {
      console.log('\n No projects found. Nothing to clean up!');
      return;
    }

    console.log(`\n Found ${projects.length} project(s):`);
    projects.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.name} (${p.domain})`);
    });

    const confirm = await askQuestion('\n  Delete ALL projects and their data? (yes/no): ');

    if (confirm.toLowerCase() !== 'yes') {
      console.log(' Cleanup cancelled.');
      return;
    }

    console.log('\n  Deleting data...\n');

    for (const project of projects) {
      console.log(`Processing project: ${project.name}`);

      // Delete checks first
      const { error: checksError } = await supabase
        .from('checks')
        .delete()
        .eq('project_id', project.id);

      if (checksError) {
        console.error('   Error deleting checks:', checksError);
      } else {
        console.log('   Checks deleted');
      }

      // Delete keywords
      const { error: keywordsError } = await supabase
        .from('keywords')
        .delete()
        .eq('project_id', project.id);

      if (keywordsError) {
        console.error('   Error deleting keywords:', keywordsError);
      } else {
        console.log('   Keywords deleted');
      }

      // Delete project
      const { error: projectDeleteError } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (projectDeleteError) {
        console.error('   Error deleting project:', projectDeleteError);
      } else {
        console.log('   Project deleted');
      }

      console.log('');
    }

    console.log(' Cleanup complete!');
    console.log('\n You can now run: npm run seed\n');

  } catch (error) {
    console.error(' Cleanup error:', error);
  } finally {
    process.exit(0);
  }
}

cleanup();