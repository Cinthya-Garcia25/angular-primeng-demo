// Migrado desde backend/src/config/supabase.ts
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables de entorno: SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridas');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
