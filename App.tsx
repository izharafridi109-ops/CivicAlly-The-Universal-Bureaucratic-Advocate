import React, { useState } from 'react';
import Landing from './components/Landing';
import LiveAgent from './components/LiveAgent';

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900">
      {!hasStarted ? (
        <Landing onStart={() => setHasStarted(true)} />
      ) : (
        <LiveAgent />
      )}
    </div>
  );
};

export default App;