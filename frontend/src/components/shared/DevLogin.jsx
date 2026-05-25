import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function DevLogin() {
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    const user = params.get('user');
    const redirect = params.get('redirect') || '/';
    if (token && user) {
      localStorage.setItem('wo_token', token);
      localStorage.setItem('wo_user', user);
      // Full reload so AuthProvider re-reads localStorage
      window.location.href = redirect;
    }
  }, []);

  return <div style={{ padding: 32, textAlign: 'center' }}>Влизане...</div>;
}
