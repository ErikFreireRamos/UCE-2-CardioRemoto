import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../src/features/ui/toast';
import { PatientCreatePage } from '../src/pages/PatientCreatePage';
import { db } from '../src/data/db';
import { putLocalPatient } from '../src/data/repo';

const CPF_VALIDO = '11144477735';

beforeEach(async () => {
  await db.patients.clear();
  await db.visits.clear();
  await db.outbox.clear();
});

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/patients/new']}>
        <Routes>
          <Route path="/patients/new" element={<PatientCreatePage />} />
          <Route path="/patients/:id" element={<div>perfil</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

describe('Cadastrar paciente (UC02)', () => {
  it('passos 1–2: os demais campos só são habilitados após o identificador ser reconhecido como novo', async () => {
    renderPage();
    const nome = screen.getByLabelText('Nome social');
    expect(nome).toBeDisabled();
    expect(screen.getByRole('button', { name: /salvar paciente/i })).toBeDisabled();

    await userEvent.type(screen.getByLabelText('CPF (identificação)'), CPF_VALIDO);

    expect(await screen.findByText(/paciente novo/i)).toBeInTheDocument();
    expect(nome).toBeEnabled();
    expect(screen.getByRole('button', { name: /salvar paciente/i })).toBeEnabled();
  });

  it('fluxo alternativo: identificador já cadastrado avisa e oferece ver o cadastro existente', async () => {
    await putLocalPatient({
      identifier: CPF_VALIDO, socialName: 'Maria Silva', birthDate: '1968-03-12T00:00:00Z',
      biologicalSex: 'F', smokingStatus: 'ex_fumante', physicalActivity: 'raramente',
      usesStatin: true, cardiovascularHistory: 'nao', cardiovascularEventAt: null,
    });

    renderPage();
    await userEvent.type(screen.getByLabelText('CPF (identificação)'), CPF_VALIDO);

    expect(await screen.findByText('Paciente já cadastrado')).toBeInTheDocument();
    expect(screen.getByText(/Maria Silva/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver cadastro/i })).toBeInTheDocument();
    // Nenhum registro novo é criado e o formulário permanece bloqueado.
    expect(screen.getByLabelText('Nome social')).toBeDisabled();
    expect(await db.patients.count()).toBe(1);
  });

  it('exige a data do evento quando o histórico é aterosclerótico', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('CPF (identificação)'), CPF_VALIDO);
    await screen.findByText(/paciente novo/i);

    await userEvent.type(screen.getByLabelText('Nome social'), 'João Teste');
    await userEvent.type(screen.getByLabelText('Data de nascimento'), '1970-05-04');
    await userEvent.click(screen.getByRole('button', { name: 'IAM' }));
    await userEvent.click(screen.getByRole('button', { name: /salvar paciente/i }));

    expect(screen.getByText(/data do evento cardiovascular/i)).toBeInTheDocument();
    expect(await db.patients.count()).toBe(0);
  });
});
