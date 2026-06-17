import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  'https://tjurwvnixoiysxregmjz.supabase.co';

const supabaseAnonKey =
  'sb_publishable_mQM4KJzC68YVYD0Nd68BCg_ePanPQcy';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);