import { createBrowserClient, createServerClient as createSupabaseServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const isDevelopment = process.env.NODE_ENV === "development"

// Development values (hardcoded)
const devSupabaseUrl = "https://ncekoxdqjqfbkqrunezf.supabase.co"
const devSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZWtveGRxanFmYmtxcnVuZXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1MTM5MzksImV4cCI6MjA3MjA4OTkzOX0.Zt8qJnvQzQa7Zt8qJnvQzQa7Zt8qJnvQzQa7Zt8qJnvQ"
const devSupabaseServiceKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZWtveGRxanFmYmtxcnVuZXpmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjUxMzkzOSwiZXhwIjoyMDcyMDg5OTM5fQ.YoOunxXqG18G9EiM4Wwu3dv0kVD4NFe5zreVlh3-WU0"

function getSupabaseConfig() {
  // Production values (from environment variables)
  const prodSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const prodSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const prodSupabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // Use development or production values based on environment
  const supabaseUrl = isDevelopment ? devSupabaseUrl : prodSupabaseUrl
  const supabaseAnonKey = isDevelopment ? devSupabaseAnonKey : prodSupabaseAnonKey
  const supabaseServiceKey = isDevelopment ? devSupabaseServiceKey : prodSupabaseServiceKey

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    console.error("[v0] Missing Supabase configuration:", {
      url: !!supabaseUrl,
      anonKey: !!supabaseAnonKey,
      serviceKey: !!supabaseServiceKey,
      environment: process.env.NODE_ENV,
    })
    throw new Error("Missing Supabase configuration. Check environment variables.")
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceKey }
}

export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Cliente para el servidor con service role key
export function createServerSupabaseClient() {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig()
  const cookieStore = cookies()

  return createSupabaseServerClient(supabaseUrl, supabaseServiceKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

export function createServerClient() {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig()
  const cookieStore = cookies()

  return createSupabaseServerClient(supabaseUrl, supabaseServiceKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set(name, value, options)
      },
      remove(name: string, options: any) {
        cookieStore.delete(name)
      },
    },
  })
}

export function createAdminClient() {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig()
  return createSupabaseServerClient(supabaseUrl, supabaseServiceKey, {
    cookies: {
      get() {
        return undefined
      },
      set() {},
      remove() {},
    },
  })
}
