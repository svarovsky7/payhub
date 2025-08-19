import { create } from 'zustand';
import { supabase } from '@/shared/api/supabase';
import type { AuthState } from '@/shared/types';

// Keep track of auth listener to avoid duplicates
let authListener: { data: { subscription: { unsubscribe: () => void } } } | null = null;

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,

  signUp: async (email: string, password: string, fullName: string) => {
    try {
      // Register user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: undefined, // Disable email redirect for local dev
        }
      });

      if (authError) {
        console.error('Registration error:', authError);
        // If email confirmation error, try to sign in directly (for local dev)
        if (authError.message?.includes('email') || authError.message?.includes('confirmation')) {
          console.log('Email confirmation error, attempting direct sign in...');
          // Try to sign in immediately
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (!signInError && signInData.user) {
            // Success - user was created and we can sign in
            authData.user = signInData.user;
            authData.session = signInData.session;
          } else {
            throw authError;
          }
        } else {
          throw authError;
        }
      }

      if (!authData.user) {
        throw new Error('Ошибка регистрации. Пожалуйста, попробуйте еще раз.');
      }

      // Try to create user profile using RPC function (more reliable with RLS)
      try {
        const { error: profileError } = await supabase.rpc('create_user_profile', {
          user_id: authData.user.id,
          user_email: email,
          user_full_name: fullName
        });

        if (profileError) {
          // If RPC fails, try direct insert (will work if RLS is properly configured)
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: email,
              full_name: fullName,
              is_active: true,
            });
          
          if (insertError) {
            console.error('Profile creation error:', insertError);
            // Don't throw error if profile creation fails - the trigger should handle it
            console.warn('Profile will be created by database trigger');
          }
        }
      } catch (rpcError) {
        console.warn('RPC function not available, relying on trigger:', rpcError);
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  },

  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        throw error;
      }

      if (data.session) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.session.user.id)
          .maybeSingle();

        if (userError) {
          console.error('User fetch error:', userError);
        }

        // If user doesn't exist in public.users, create them
        if (!userData) {
          console.log('User not found in public.users, creating...');
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: data.session.user.id,
              email: data.session.user.email || '',
              full_name: data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0] || 'User',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_active: true
            })
            .select()
            .single();

          if (createError) {
            console.error('Failed to create user in public.users:', createError);
          }

          set({
            user: newUser || {
              id: data.session.user.id,
              email: data.session.user.email || '',
              full_name: data.session.user.user_metadata?.full_name || data.session.user.email || '',
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            session: data.session,
            loading: false,
          });
        } else {
          set({
            user: userData,
            session: data.session,
            loading: false,
          });
        }
      }
    } catch (error) {
      set({ user: null, session: null, loading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        throw error;
      }

      set({ user: null, session: null, loading: false });
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  },

  initialize: async () => {
    try {
      set({ loading: true });

      // Try to refresh session first to ensure fresh token
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      // If refresh fails, try to get current session
      const { data: { session }, error: sessionError } = refreshError 
        ? await supabase.auth.getSession()
        : { data: { session: refreshedSession }, error: null };
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        set({ user: null, session: null, loading: false });
        return;
      }

      if (session) {
        // Fetch user profile
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle(); // Use maybeSingle instead of single to avoid error if user doesn't exist

        if (userError) {
          console.error('User fetch error:', userError);
        }

        // If user doesn't exist in public.users, create them
        if (!userData) {
          console.log('User not found in public.users during initialization, creating...');
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
              project_id: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              is_active: true
            })
            .select()
            .single();

          if (createError) {
            console.error('Failed to create user in public.users during initialization:', createError);
            // Use fallback user data if creation fails
            const fallbackUser = {
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || session.user.email || '',
              project_id: null,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            set({ user: fallbackUser, session, loading: false });
            return;
          }

          set({
            user: newUser,
            session,
            loading: false,
          });
        } else {
          set({
            user: userData,
            session,
            loading: false,
          });
        }
      } else {
        set({ user: null, session: null, loading: false });
      }

      // Listen for auth changes (only if not already listening)
      if (!authListener) {
        authListener = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (userError) {
              console.error('User fetch error on auth change:', userError);
            }

            set({
              user: userData || {
                id: session.user.id,
                email: session.user.email || '',
                full_name: session.user.user_metadata?.full_name || session.user.email || '',
                project_id: null,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              },
              session,
              loading: false,
            });
          } else if (event === 'SIGNED_OUT') {
            set({ user: null, session: null, loading: false });
          }
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ user: null, session: null, loading: false });
    }
  },

  refreshSession: async () => {
    try {
      // Don't set loading to true to avoid UI flicker
      const currentSession = get().session;
      
      // Only refresh if we have a session
      if (!currentSession) {
        return;
      }

      // Try to refresh session
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh error:', error);
        // If refresh fails, the session might be expired
        // The auth listener will handle the sign out
        return;
      }

      if (session) {
        // Update session without changing loading state
        set({ session });
      }
    } catch (error) {
      console.error('Session refresh error:', error);
    }
  },
}));