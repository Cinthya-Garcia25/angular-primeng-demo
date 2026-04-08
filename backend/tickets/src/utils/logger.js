const { supabase } = require('../config/database');

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
