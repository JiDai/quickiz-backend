import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	`https://${process.env.SUPABASE_ID}.supabase.co`,
	process.env.SUPABASE_KEY!,
);

export default supabase;
