import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cvdbnxeqbirrdyfwrgso.supabase.co';
const supabaseAnonKey = 'sb_publishable_oh-OLBt29AfkWdhg5zIOrg_nf1cva3z';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
