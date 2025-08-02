import { supabase } from '@/shared/api';

export const debugSupabase = {
  async testConnection() {
    try {
      const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
      console.log('Test connection result:', { data, error });
      return { success: !error, error };
    } catch (error) {
      console.error('Connection test failed:', error);
      return { success: false, error };
    }
  },

  async testRegistration(email: string, password: string, _fullName: string) {
    try {
      console.log('Testing registration with minimal data...');
      
      // First, try to sign up without metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      console.log('Simple signup result:', { data, error });
      
      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Registration test failed:', error);
      return { success: false, error: String(error) };
    }
  },

  async checkAuth() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('Current session:', { session, error });
      return { session, error };
    } catch (error) {
      console.error('Auth check failed:', error);
      return { session: null, error };
    }
  },

  async checkConfig() {
    console.log('Supabase config:', {
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.slice(0, 20) + '...',
    });
  }
};

// Make it available globally for debugging
(window as any).debugSupabase = debugSupabase;