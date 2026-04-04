import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridas');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
