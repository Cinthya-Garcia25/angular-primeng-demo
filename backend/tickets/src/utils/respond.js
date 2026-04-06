// Helper para respuestas con esquema global uniforme (Fastify)
function ok(reply, statusCode, intOpCode, data) {
    return reply.code(statusCode).send({ statusCode, intOpCode, data });
}

function fail(reply, statusCode, intOpCode, message) {
    return reply.code(statusCode).send({ statusCode, intOpCode, data: null, message });
}

module.exports = { ok, fail };
