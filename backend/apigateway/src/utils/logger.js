const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Registra un request HTTP en la tabla logs.
 * Fire-and-forget: nunca lanza errores hacia el caller.
 */
function logRequest({ servicio, metodo, endpoint, usuario_id, ip, status_http, duracion_ms }) {
  supabase.from('logs').insert({
    tipo: 'request',
    servicio,
    metodo,
    endpoint,
    usuario_id: usuario_id ?? null,
    ip: ip ?? null,
    status_http,
    duracion_ms
  }).then(() => {}).catch(() => {});
}

/**
 * Registra un error interno en la tabla logs.
 * Fire-and-forget: nunca lanza errores hacia el caller.
 */
function logError({ servicio, metodo, endpoint, usuario_id, ip, mensaje, stack_trace }) {
  supabase.from('logs').insert({
    tipo: 'error',
    servicio,
    metodo,
    endpoint,
    usuario_id: usuario_id ?? null,
    ip: ip ?? null,
    mensaje,
    stack_trace: stack_trace ?? null
  }).then(() => {}).catch(() => {});
}

module.exports = { logRequest, logError };
