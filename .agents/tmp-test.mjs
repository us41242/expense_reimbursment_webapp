import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// load env vars manually
const envPath = path.join(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) env[match[1]] = match[2].trim()
})

const url = env['NEXT_PUBLIC_SUPABASE_URL']
const key = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

const supabase = createClient(url, key)

async function run() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password123'
  })
  
  if (error) {
    console.error('ERROR:', error.message)
    console.error('STATUS:', error.status)
  } else {
    console.log('SUCCESS!')
  }
}

run()
