/** Tratamento de erros: mensagens claras para o usuário, detalhes só no log. */
export function apiNotFound(req, res) {
  res.status(404).json({ error: `Rota não encontrada: ${req.method} ${req.originalUrl.split('?')[0]}` });
}

export function errorHandler(logger) {
  return (err, req, res, _next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Corpo da requisição grande demais.' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido.' });
    const status = Number(err.status) >= 400 && Number(err.status) < 600 ? Number(err.status) : 500;
    if (status >= 500) logger.error(`[api] ${req.method} ${req.originalUrl}: ${err.stack || err.message}`);
    res.status(status).json({ error: status >= 500 ? 'Algo deu errado na fazenda. Veja os logs do servidor.' : err.message });
  };
}
