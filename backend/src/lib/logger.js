/** Logger simples com horário; em testes pode ser silenciado com LOG_LEVEL=silent. */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };

export function createLogger(level = process.env.LOG_LEVEL || 'info') {
  const min = LEVELS[level] ?? 20;
  const at = () => new Date().toISOString();
  const mk = (name, fn) => (msg, ...rest) => {
    if (LEVELS[name] >= min) fn(`${at()} ${name.toUpperCase().padEnd(5)} ${msg}`, ...rest);
  };
  return {
    debug: mk('debug', console.debug),
    info: mk('info', console.log),
    warn: mk('warn', console.warn),
    error: mk('error', console.error),
  };
}
