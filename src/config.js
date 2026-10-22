export const SUPABASE_URL = 'https://watggekythyoxgelzdri.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_8Tb9kPWz54eHCzE65ZuHiA_XiJVoRI8';

export const APP_CONFIG = Object.freeze({
  appName: 'ClassConnect',
  tagline: 'learning, teaching and applying further algebra',
  bootstrapEmail: 'lecturerkafui@gmail.com',
  maxCommentLength: 2000,
  supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY),
});
