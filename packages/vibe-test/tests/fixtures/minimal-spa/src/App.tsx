import { useState } from 'react';

interface AppProps {
  initialCount?: number;
}

export function App({ initialCount = 0 }: AppProps) {
  const [count, setCount] = useState(initialCount);
  return (
    <div className="app">
      <h1>Minimal SPA</h1>
      <button onClick={() => setCount(count + 1)}>{count}</button>
    </div>
  );
}

export default App;
