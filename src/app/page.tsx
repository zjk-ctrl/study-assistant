'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Clock, BookOpen, Music, Play, Pause, RotateCcw, 
  Plus, Trash2, Check, Calendar, Volume2, VolumeX,
  Settings, Target, ListTodo, ChevronDown, ChevronUp, Users,
  LogOut, Flame, Trophy, Search, UserPlus, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/components/auth-provider';
import { getSupabaseBrowserClient } from '@/storage/database/supabase-client';

// 类型定义
interface TimerSettings {
  focus_duration: number;
  short_break: number;
  long_break: number;
  sessions_before_long_break: number;
  reminder_enabled: boolean;
  reminder_interval: number;
}

interface Plan {
  id: string;
  title: string;
  description?: string;
  target_hours: number;
  completed_hours: number;
  deadline?: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  username: string;
  avatar_url?: string;
  total_study_minutes: number;
  total_pomodoros: number;
  current_streak: number;
  longest_streak: number;
  last_study_date?: string;
}

interface FriendRequest {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  requester: UserProfile;
}

export default function StudyHelperPage() {
  const { user, profile, signOut, isLoading: authLoading } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  
  // 计时器状态
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [timerSettings, setTimerSettings] = useState<TimerSettings>({
    focus_duration: 25,
    short_break: 5,
    long_break: 15,
    sessions_before_long_break: 4,
    reminder_enabled: false,
    reminder_interval: 30,
  });
  
  // 计划状态
  const [plans, setPlans] = useState<Plan[]>([]);
  const [newPlan, setNewPlan] = useState({ title: '', targetHours: 1, deadline: '' });
  
  // 设置状态
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderInterval, setReminderInterval] = useState(30);
  
  // 音乐状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  
  // 用户资料状态
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [todayMinutes, setTodayMinutes] = useState(0);
  
  // 好友状态
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 背景音乐
  const musicTracks = [
    { name: '雨后森林', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { name: '海浪轻音乐', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { name: '专注钢琴曲', src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  ];
  
  // 辅助函数
  const showNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }, []);
  
  // 更新学习统计
  const updateStudyStats = useCallback(async (minutes: number) => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    
    // 更新今日学习记录
    const { data: existing } = await supabase
      .from('study_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();
    
    if (existing) {
      await supabase.from('study_records').update({
        study_minutes: existing.study_minutes + minutes,
        pomodoros_completed: existing.pomodoros_completed + 1,
      }).eq('id', existing.id);
    } else {
      await supabase.from('study_records').insert({
        user_id: user.id,
        date: today,
        study_minutes: minutes,
        pomodoros_completed: 1,
      });
    }
    
    // 更新用户统计
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    
    if (profileData) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const lastDate = profileData.last_study_date;
      const newStreak = lastDate === yesterday 
        ? profileData.current_streak + 1 
        : lastDate === today 
          ? profileData.current_streak 
          : 1;
      
      await supabase.from('user_profiles').update({
        total_study_minutes: profileData.total_study_minutes + minutes,
        total_pomodoros: profileData.total_pomodoros + 1,
        current_streak: newStreak,
        longest_streak: Math.max(profileData.longest_streak, newStreak),
        last_study_date: today,
      }).eq('id', user.id);
    }
    
    setTodayMinutes(prev => prev + minutes);
    // 重新加载用户资料
    const { data: updatedProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (updatedProfile) setUserProfile(updatedProfile);
  }, [user, supabase]);
  
  // 计时器完成处理
  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    
    if (!isBreak) {
      setSessions(prev => prev + 1);
      showNotification('专注时间结束', '休息一下吧！');
      updateStudyStats(timerSettings.focus_duration);
      
      const isLongBreak = sessions > 0 && sessions % timerSettings.sessions_before_long_break === 0;
      setIsBreak(true);
      setTimeLeft(isLongBreak ? timerSettings.long_break * 60 : timerSettings.short_break * 60);
    } else {
      showNotification('休息结束', '准备开始下一个专注时段！');
      setIsBreak(false);
      setTimeLeft(timerSettings.focus_duration * 60);
    }
  }, [isBreak, sessions, timerSettings, showNotification, updateStudyStats]);
  
  // 加载用户资料
  const loadUserProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (data) setUserProfile(data);
  }, [user, supabase]);
  
  // 加载计划
  const loadPlans = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setPlans(data);
  }, [user, supabase]);
  
  // 加载好友
  const loadFriends = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('friendships')
      .select('*, requester:requester_id(*), addressee:addressee_id(*)')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    
    if (data) {
      const friendList = data.map((f: { requester_id: string; addressee: UserProfile; requester: UserProfile }) => 
        f.requester_id === user.id ? f.addressee : f.requester
      ).filter(Boolean);
      setFriends(friendList as UserProfile[]);
    }
  }, [user, supabase]);
  
  // 加载好友请求
  const loadFriendRequests = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('friendships')
      .select('*, requester:requester_id(*)')
      .eq('addressee_id', user.id)
      .eq('status', 'pending');
    if (data) setFriendRequests(data);
  }, [user, supabase]);
  
  // 加载计时器设置
  const loadTimerSettings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('timer_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setTimerSettings(data);
      setTimeLeft(data.focus_duration * 60);
      setReminderEnabled(data.reminder_enabled);
      setReminderInterval(data.reminder_interval);
    }
  }, [user, supabase]);
  
  // 加载今日学习时间
  const loadTodayMinutes = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('study_records')
      .select('study_minutes')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();
    if (data) setTodayMinutes(data.study_minutes);
  }, [user, supabase]);
  
  // 加载所有数据
  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadPlans();
      loadFriends();
      loadFriendRequests();
      loadTimerSettings();
      loadTodayMinutes();
    }
  }, [user, loadUserProfile, loadPlans, loadFriends, loadFriendRequests, loadTimerSettings, loadTodayMinutes]);
  
  // 搜索用户
  const searchUsers = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .ilike('username', `%${searchQuery}%`)
      .neq('id', user?.id)
      .limit(10);
    setSearchResults(data || []);
    setIsSearching(false);
  };
  
  // 发送好友请求
  const sendFriendRequest = async (addresseeId: string) => {
    if (!user) return;
    const { error } = await supabase.from('friendships').insert({
      requester_id: user.id,
      addressee_id: addresseeId,
    });
    if (!error) {
      setSearchResults(searchResults.filter(r => r.id !== addresseeId));
    }
  };
  
  // 处理好友请求
  const handleFriendRequest = async (requestId: string, accept: boolean) => {
    if (accept) {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);
    } else {
      await supabase.from('friendships').update({ status: 'rejected' }).eq('id', requestId);
    }
    loadFriendRequests();
    loadFriends();
  };
  
  // 计时器逻辑
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, handleTimerComplete]);
  
  // 提醒功能
  useEffect(() => {
    if (!reminderEnabled) return;
    
    const interval = setInterval(() => {
      if (!isRunning) {
        showNotification('学习提醒', '是时候开始学习了！保持专注，你一定可以的！');
      }
    }, reminderInterval * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [reminderEnabled, reminderInterval, isRunning, showNotification]);
  
  useEffect(() => {
    if (notificationsEnabled && 'Notification' in window) {
      Notification.requestPermission();
    }
  }, [notificationsEnabled]);
  
  // 计时器控制
  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(isBreak ? timerSettings.short_break * 60 : timerSettings.focus_duration * 60);
  };
  
  const skipToNext = () => {
    setIsRunning(false);
    if (!isBreak) {
      setSessions(prev => prev + 1);
      const isLongBreak = sessions > 0 && sessions % timerSettings.sessions_before_long_break === 0;
      setIsBreak(true);
      setTimeLeft(isLongBreak ? timerSettings.long_break * 60 : timerSettings.short_break * 60);
    } else {
      setIsBreak(false);
      setTimeLeft(timerSettings.focus_duration * 60);
    }
  };
  
  // 计划管理
  const addPlan = async () => {
    if (!user || !newPlan.title.trim()) return;
    const { error } = await supabase.from('user_plans').insert({
      user_id: user.id,
      title: newPlan.title,
      target_hours: newPlan.targetHours,
      deadline: newPlan.deadline || null,
    });
    if (!error) {
      setNewPlan({ title: '', targetHours: 1, deadline: '' });
      loadPlans();
    }
  };
  
  const deletePlan = async (id: string) => {
    await supabase.from('user_plans').delete().eq('id', id);
    loadPlans();
  };
  
  const updatePlanHours = async (id: string, hours: number) => {
    await supabase.from('user_plans').update({ completed_hours: hours }).eq('id', id);
    loadPlans();
  };
  
  // 保存设置
  const saveSettings = async () => {
    if (!user) return;
    const { error } = await supabase.from('timer_settings').upsert({
      user_id: user.id,
      ...timerSettings,
    });
    if (!error) {
      showNotification('设置已保存', '你的番茄钟设置已更新');
    }
  };
  
  // 音乐控制
  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const nextTrack = () => {
    setCurrentTrack((prev) => (prev + 1) % musicTracks.length);
    setIsPlaying(true);
  };
  
  const prevTrack = () => {
    setCurrentTrack((prev) => (prev - 1 + musicTracks.length) % musicTracks.length);
    setIsPlaying(true);
  };
  
  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // 格式化小时
  const formatHours = (hours: number) => {
    return hours >= 1 ? `${hours}h` : `${Math.round(hours * 60)}m`;
  };
  
  // 重定向未登录用户
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);
  
  // 显示加载状态
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">加载中...</p>
        </div>
      </div>
    );
  }
  
  const progress = isBreak 
    ? ((timerSettings.short_break * 60 - timeLeft) / (timerSettings.short_break * 60)) * 100
    : ((timerSettings.focus_duration * 60 - timeLeft) / (timerSettings.focus_duration * 60)) * 100;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* 顶部导航 */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 rounded-xl">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">学习助手</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                欢迎回来，{profile?.username || user.email?.split('@')[0] || '用户'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 学习统计 */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                <span className="text-gray-700 dark:text-gray-300">{userProfile?.current_streak || 0} 天</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-gray-700 dark:text-gray-300">{todayMinutes} 分钟</span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMusicPlayer(!showMusicPlayer)}
            >
              <Music className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              退出
            </Button>
          </div>
        </header>
        
        {/* 好友请求提示 */}
        {friendRequests.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  有 {friendRequests.length} 个好友请求待处理
                </span>
              </div>
            </div>
          </div>
        )}
        
        <Tabs defaultValue="timer" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="timer" className="gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">计时器</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">学习计划</span>
            </TabsTrigger>
            <TabsTrigger value="friends" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">好友</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">设置</span>
            </TabsTrigger>
          </TabsList>
          
          {/* 计时器页面 */}
          <TabsContent value="timer" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* 番茄钟 */}
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="flex items-center justify-center gap-2">
                    {isBreak ? (
                      <span className="text-green-600 dark:text-green-400">休息时间</span>
                    ) : (
                      <span className="text-purple-600 dark:text-purple-400">专注时间</span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    第 {sessions + 1} 个番茄钟
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 圆形进度 */}
                  <div className="relative w-64 h-64 mx-auto">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="128"
                        cy="128"
                        r="120"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 120}
                        strokeDashoffset={2 * Math.PI * 120 * (1 - progress / 100)}
                        className={isBreak ? 'text-green-500' : 'text-purple-500'}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-bold text-gray-900 dark:text-white">
                        {formatTime(timeLeft)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {isBreak ? '休息一下' : '专注学习'}
                      </span>
                    </div>
                  </div>
                  
                  {/* 控制按钮 */}
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={resetTimer}
                      className="rounded-full h-12 w-12"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </Button>
                    <Button
                      size="lg"
                      onClick={toggleTimer}
                      className={`rounded-full h-16 w-16 ${
                        isBreak 
                          ? 'bg-green-600 hover:bg-green-700' 
                          : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                    >
                      {isRunning ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6 ml-1" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={skipToNext}
                      className="rounded-full h-12 w-12"
                    >
                      <ChevronUp className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  {/* 今日统计 */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{todayMinutes}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">今日分钟</p>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{sessions}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">完成番茄</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {userProfile?.total_pomodoros || 0}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">累计番茄</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* 今日计划进度 */}
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListTodo className="h-5 w-5 text-purple-600" />
                    今日计划
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {plans.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>还没有学习计划</p>
                      <p className="text-sm">去「学习计划」标签添加一个吧</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {plans.slice(0, 3).map((plan) => (
                        <div key={plan.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-900 dark:text-white">{plan.title}</span>
                            <span className="text-sm text-gray-500">
                              {formatHours(plan.completed_hours)} / {formatHours(plan.target_hours)}
                            </span>
                          </div>
                          <Progress 
                            value={(plan.completed_hours / plan.target_hours) * 100} 
                            className="h-2"
                          />
                        </div>
                      ))}
                      {plans.length > 3 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                          还有 {plans.length - 3} 个计划...
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* 学习计划页面 */}
          <TabsContent value="plans" className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur">
              <CardHeader>
                <CardTitle>学习计划管理</CardTitle>
                <CardDescription>制定并追踪你的学习目标</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 添加新计划 */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    placeholder="计划名称..."
                    value={newPlan.title}
                    onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                    className="flex-1"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="目标小时"
                      value={newPlan.targetHours}
                      onChange={(e) => setNewPlan({ ...newPlan, targetHours: Number(e.target.value) })}
                      className="w-28"
                      min={0.5}
                      step={0.5}
                    />
                    <Input
                      type="date"
                      value={newPlan.deadline}
                      onChange={(e) => setNewPlan({ ...newPlan, deadline: e.target.value })}
                      className="w-40"
                    />
                    <Button onClick={addPlan}>
                      <Plus className="h-4 w-4 mr-2" />
                      添加
                    </Button>
                  </div>
                </div>
                
                {/* 计划列表 */}
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <div 
                      key={plan.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">{plan.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span>{formatHours(plan.completed_hours)} / {formatHours(plan.target_hours)}</span>
                          {plan.deadline && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {plan.deadline}
                            </span>
                          )}
                        </div>
                        <Progress 
                          value={(plan.completed_hours / plan.target_hours) * 100} 
                          className="h-2 mt-2"
                        />
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updatePlanHours(plan.id, plan.completed_hours + 0.5)}
                        >
                          +0.5h
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updatePlanHours(plan.id, plan.completed_hours + 1)}
                        >
                          +1h
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deletePlan(plan.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {plans.length === 0 && (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <Target className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">暂无学习计划</p>
                      <p className="text-sm mt-2">上方添加你的第一个学习计划吧</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* 好友页面 */}
          <TabsContent value="friends" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* 好友列表 */}
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    我的好友
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {friends.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>还没有好友</p>
                      <p className="text-sm">搜索添加好友一起监督学习吧</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {friends.map((friend) => (
                        <div 
                          key={friend.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={friend.avatar_url || ''} />
                            <AvatarFallback className="bg-purple-100 text-purple-600">
                              {friend.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{friend.username}</p>
                            <p className="text-xs text-gray-500">
                              {friend.current_streak || 0} 天连续学习 · {friend.total_pomodoros || 0} 番茄
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {friend.total_study_minutes ? formatHours(friend.total_study_minutes / 60) : '0h'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* 搜索好友 */}
              <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-purple-600" />
                    搜索好友
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="输入用户名搜索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                    />
                    <Button onClick={searchUsers} disabled={isSearching}>
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="space-y-2">
                      {searchResults.map((result) => (
                        <div 
                          key={result.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={result.avatar_url || ''} />
                            <AvatarFallback className="bg-purple-100 text-purple-600">
                              {result.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{result.username}</p>
                          </div>
                          <Button size="sm" onClick={() => sendFriendRequest(result.id)}>
                            <UserPlus className="h-4 w-4 mr-1" />
                            添加
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Separator />
                  
                  {/* 待处理请求 */}
                  {friendRequests.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">待处理请求</h4>
                      {friendRequests.map((request) => (
                        <div 
                          key={request.id}
                          className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={request.requester?.avatar_url || ''} />
                            <AvatarFallback className="bg-amber-100 text-amber-600">
                              {request.requester?.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {request.requester?.username || '未知用户'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleFriendRequest(request.id, true)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleFriendRequest(request.id, false)}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* 设置页面 */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur">
              <CardHeader>
                <CardTitle>番茄钟设置</CardTitle>
                <CardDescription>自定义你的学习节奏</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">专注时长 (分钟)</label>
                    <Input
                      type="number"
                      value={timerSettings.focus_duration}
                      onChange={(e) => setTimerSettings({ ...timerSettings, focus_duration: Number(e.target.value) })}
                      min={1}
                      max={120}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">短休息 (分钟)</label>
                    <Input
                      type="number"
                      value={timerSettings.short_break}
                      onChange={(e) => setTimerSettings({ ...timerSettings, short_break: Number(e.target.value) })}
                      min={1}
                      max={30}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">长休息 (分钟)</label>
                    <Input
                      type="number"
                      value={timerSettings.long_break}
                      onChange={(e) => setTimerSettings({ ...timerSettings, long_break: Number(e.target.value) })}
                      min={1}
                      max={60}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">长休息间隔</label>
                    <Input
                      type="number"
                      value={timerSettings.sessions_before_long_break}
                      onChange={(e) => setTimerSettings({ ...timerSettings, sessions_before_long_break: Number(e.target.value) })}
                      min={1}
                      max={10}
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">浏览器通知</p>
                      <p className="text-sm text-gray-500">计时结束时发送通知</p>
                    </div>
                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={setNotificationsEnabled}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">学习提醒</p>
                      <p className="text-sm text-gray-500">定时提醒你开始学习</p>
                    </div>
                    <Switch
                      checked={reminderEnabled}
                      onCheckedChange={setReminderEnabled}
                    />
                  </div>
                  
                  {reminderEnabled && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">提醒间隔 (分钟)</label>
                      <Input
                        type="number"
                        value={reminderInterval}
                        onChange={(e) => setReminderInterval(Number(e.target.value))}
                        min={5}
                        max={120}
                        className="w-40"
                      />
                    </div>
                  )}
                </div>
                
                <Button onClick={saveSettings} className="w-full sm:w-auto">
                  保存设置
                </Button>
              </CardContent>
            </Card>
            
            {/* 学习统计 */}
            <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur">
              <CardHeader>
                <CardTitle>学习统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {userProfile?.total_pomodoros || 0}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">累计番茄</p>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-center">
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {userProfile?.current_streak || 0}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">当前连续</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {userProfile?.longest_streak || 0}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">最长连续</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {formatHours((userProfile?.total_study_minutes || 0) / 60)}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">总学习时长</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* 音乐播放器 */}
      {showMusicPlayer && (
        <div className="fixed bottom-20 right-4 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">背景音乐</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowMusicPlayer(false)}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            {musicTracks.map((track, index) => (
              <div
                key={index}
                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                  currentTrack === index 
                    ? 'bg-purple-100 dark:bg-purple-900/30' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => {
                  setCurrentTrack(index);
                  setIsPlaying(true);
                }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentTrack(index);
                    setIsPlaying(!isPlaying || currentTrack !== index);
                  }}
                >
                  {currentTrack === index && isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <span className="text-sm text-gray-700 dark:text-gray-300">{track.name}</span>
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-4 mt-4">
            <Button variant="ghost" size="icon" onClick={prevTrack}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button 
              size="icon"
              onClick={togglePlay}
              className="bg-purple-600 hover:bg-purple-700 rounded-full h-10 w-10"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={nextTrack}>
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 mt-3">
            <VolumeX 
              className="h-4 w-4 text-gray-500 cursor-pointer"
              onClick={() => setIsMuted(!isMuted)}
            />
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                setIsMuted(false);
              }}
              className="flex-1 accent-purple-600"
            />
            <Volume2 className="h-4 w-4 text-gray-500" />
          </div>
        </div>
      )}
      
      {/* 隐藏的音频播放器 */}
      <audio
        ref={audioRef}
        src={musicTracks[currentTrack]?.src}
        loop
      />
      
      {/* 底部音乐快捷控制 */}
      {!showMusicPlayer && (
        <div className="fixed bottom-4 right-4">
          <Button
            size="icon"
            className="h-12 w-12 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg"
            onClick={() => setShowMusicPlayer(true)}
          >
            {isPlaying ? (
              <Music className="h-5 w-5 animate-pulse" />
            ) : (
              <Music className="h-5 w-5" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
