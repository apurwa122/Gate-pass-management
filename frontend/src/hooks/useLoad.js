import { useEffect, useState } from 'react';

export function useLoad(loader, deps = []) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const reload = async () => {
    setBusy(true);
    setError('');
    try {
      setData(await loader());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    reload();
  }, deps);
  return { data, error, busy, reload, setData };
}
