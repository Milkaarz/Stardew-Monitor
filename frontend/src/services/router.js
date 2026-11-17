/** Roteador por hash (#/fazenda, #/processos...): funciona em qualquer hospedagem estática. */
import { useEffect, useState } from 'preact/hooks';

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  return { path: `/${path}`.replace(/\/+$/, '') || '/', query: Object.fromEntries(new URLSearchParams(query)) };
}

export function navigate(path) {
  if (`#${path}` !== location.hash) location.hash = path;
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseHash());
  useEffect(() => {
    const on = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0 });
    };
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}
