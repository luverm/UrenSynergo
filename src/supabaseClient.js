import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log("🔗 Supabase URL:", supabaseUrl || "⚠️ NIET INGESTELD")
console.log("🔑 Supabase Key:", supabaseKey ? "✅ Aanwezig" : "⚠️ NIET INGESTELD")

export const supabase = createClient(supabaseUrl || "", supabaseKey || "")
