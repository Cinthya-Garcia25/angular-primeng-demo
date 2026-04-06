const { default: fetch } = require('node-fetch');

async function serviceProxy(req, reply, routesMap) {
    const prefix = Object.keys(routesMap).find(p => req.url.startsWith(p));

    if (!prefix) {
        return reply.code(404).send({
            statusCode: 404, intOpCode: 'SxGW404', data: null,
            message: 'Ruta no encontrada'
        });
    }

    const targetUrl = `${routesMap[prefix]}${req.url}`;
    // Eliminamos host y content-length: el body re-serializado puede tener
    // distinto tamaño y un content-length incorrecto rompe el body parser de Express
    const { host, 'content-length': _cl, ...headers } = req.headers;
    headers['content-type'] = 'application/json';

    try {
        const upstream = await fetch(targetUrl, {
            method:  req.method,
            headers,
            body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
        });

        const data = await upstream.json().catch(() => null);
        return reply.code(upstream.status).send(data);

    } catch (err) {
        return reply.code(502).send({
            statusCode: 502, intOpCode: 'SxGW502', data: null,
            message: `Bad Gateway: ${err.message}`
        });
    }
}

module.exports = { serviceProxy };
