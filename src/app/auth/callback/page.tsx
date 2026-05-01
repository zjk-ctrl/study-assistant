'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/storage/database/supabase-client';

export default function AuthCallbackPage() {
  const router = useRouter();
  
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    
    // 处理 OAuth 回调
    supabase.auth.getSession().then(({ data }: { data: { session: unknown } }) => {
      if (data.session) {
        router.push('/');
      }
    });
    
    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: unknown) => {
      if (session) {
        router.push('/');
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);
  
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">正在处理登录...</p>
      </div>
    </div>
  );
}
