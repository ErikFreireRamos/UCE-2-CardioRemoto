import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { seedIfEmpty } from './data/seed';

async function bootstrap() {
  // Popula o dataset local uma vez, para o app funcionar mesmo sem backend.
  try {
    await seedIfEmpty();
  } catch (err) {
    console.error('Falha ao popular dataset local', err);
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
