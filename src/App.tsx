import { lazy, Suspense, useEffect, useState } from 'react';
import { isDesktopEnvironment } from './lib/desktopGate';
import { MobilePortfolio } from './ui/MobilePortfolio';

const DesktopGarageApp = lazy(() => import('./ui/DesktopGarageApp'));

function useDesktopAllowed() {
  const [ok, setOk] = useState(() => isDesktopEnvironment());
  useEffect(() => {
    const check = () => setOk(isDesktopEnvironment());
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return ok;
}

function App() {
  const desktop = useDesktopAllowed();

  if (!desktop) {
    return <MobilePortfolio />;
  }

  return (
    <Suspense fallback={<div className="mobile-stage-fallback" role="status">Loading garage…</div>}>
      <DesktopGarageApp />
    </Suspense>
  );
}

export default App;
