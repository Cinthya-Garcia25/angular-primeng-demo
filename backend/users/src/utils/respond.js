function ok(res, statusCode, intOpCode, data) {
    return res.status(statusCode).json({ statusCode, intOpCode, data });
}

function fail(res, statusCode, intOpCode, message) {
    return res.status(statusCode).json({ statusCode, intOpCode, data: null, message });
}

module.exports = { ok, fail };
