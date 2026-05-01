import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 浏览器端使用的 Supabase 客户端
// 环境变量通过 Next.js 的 NEXT_PUBLIC_ 前缀注入

let supabaseClient: SupabaseClient | null = null;

/**
 * 获取浏览器端 Supabase 客户端
 * 使用 @supabase/supabase-js 的标准用法
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase credentials not configured. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}

// 为了兼容，导出相同的函数名
export function getSupabaseClient(): SupabaseClient {
  return getSupabaseBrowserClient();
}
