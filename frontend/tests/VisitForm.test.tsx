import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../src/features/ui/toast';
import { VisitCreatePage } from '../src/pages/VisitCreatePage';
import { db } from '../src/data/db';

beforeEach(async () => {
  await db.patients.clear();
  await db.visits.clear();
  await db.outbox.clear();
});

function renderForm() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/patients/p1/visits/new']}>
        <Routes>
          <Route path="/patients/:id/visits/new" element={<VisitCreatePage />} />
          <Route path="/patients/:id" element={<div>perfil</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('Nova visita', () => {
  it('Salvar começa desabilitado (nenhum campo) e habilita ao preencher', async () => {
    renderForm();
    const save = screen.getByRole('button', { name: /salvar visita/i });
    expect(save).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Peso (kg)'), '70');
    expect(save).toBeEnabled();
  });

  it('mostra alerta amarelo em tempo real quando LDL ≥ 190', async () => {
    renderForm();
    expect(screen.queryByText(/LDL ≥190/i)).toBeNull();
    await userEvent.type(screen.getByLabelText('LDL'), '196');
    expect(screen.getByText(/LDL ≥190/i)).toBeInTheDocument();
  });

  it('calcula IMC automaticamente a partir de peso e altura', async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText('Peso (kg)'), '70');
    await userEvent.type(screen.getByLabelText('Altura (cm)'), '175');
    expect(screen.getByText('22,9')).toBeInTheDocument();
  });
});
