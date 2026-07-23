import { describe, expect, it } from 'vitest';
import { buildEvolutionCsv, evolutionFileName } from '../src/features/evolution/export';
import type { LocalVisit } from '../src/data/schema';
import type { Measurements } from '../src/clinical';

function visit(collectedAt: string, measurements: Measurements): LocalVisit {
  return { id: collectedAt, patientId: 'p1', collectedAt, measurements, createdAt: collectedAt, updatedAt: collectedAt, syncState: 'synced' };
}

const visits = [
  visit('2026-01-10T09:00:00Z', { weight: 72.5, bloodPressureSystolic: 152, bloodPressureDiastolic: 96, ldl: 178 }),
  visit('2026-03-20T09:00:00Z', { bloodPressureSystolic: 142, bloodPressureDiastolic: 88 }),
];

const base = { socialName: 'Maria Silva', identifier: '11144477735', visits, now: new Date('2026-07-23T15:30:00') };

describe('exportar planilha da evolução', () => {
  it('usa cabeçalho com uma coluna por data, da mais recente para a mais antiga', () => {
    const linhas = buildEvolutionCsv(base).split('\r\n');
    const cabecalho = linhas.find((l) => l.startsWith('Grupo'))!;
    expect(cabecalho).toBe('Grupo;Dado;Unidade;20/03/2026;10/01/2026');
  });

  it('traz uma linha por dado coletado, com PA como par e célula vazia quando não houve coleta', () => {
    const linhas = buildEvolutionCsv(base).split('\r\n');
    expect(linhas).toContain('Antropométricos;Peso;kg;;72,5');
    expect(linhas).toContain('Medições vitais;Pressão arterial;mmHg;142/88;152/96');
    expect(linhas).toContain('Exames laboratoriais;Colesterol LDL;mg/dL;;178');
    // Métrica nunca coletada não vira linha.
    expect(linhas.some((l) => l.includes(';TSH;'))).toBe(false);
  });

  it('identifica o paciente e o momento da exportação', () => {
    const csv = buildEvolutionCsv(base);
    expect(csv).toContain('Paciente;Maria Silva');
    expect(csv).toContain('CPF;111.444.777-35');
    expect(csv).toContain('Exportado em;23/07/2026 15:30');
    expect(csv).toContain('Visitas;2');
  });

  it('escapa separador e aspas para não quebrar colunas', () => {
    const csv = buildEvolutionCsv({ ...base, socialName: 'Silva; "Zé" Souza' });
    expect(csv).toContain('Paciente;"Silva; ""Zé"" Souza"');
  });

  it('gera nome de arquivo sem acentos nem espaços', () => {
    expect(evolutionFileName('José Antônio Nunes', new Date('2026-07-23T10:00:00'))).toBe('evolucao-jose-antonio-nunes-2026-07-23.csv');
  });
});
