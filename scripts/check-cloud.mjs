import { loadEnv } from 'vite'

const env = loadEnv('production', process.cwd(), 'VITE_')
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !key) throw new Error('Configure the Supabase project URL and publishable key.')
const response = await fetch(url + '/rest/v1/crew_health_packets?select=id&limit=0', {
  headers: { apikey: key },
})
const body = await response.json()
console.log('Cloud schema probe:', response.status, Array.isArray(body) ? 'Table responds' : body.code + ': ' + body.message)
