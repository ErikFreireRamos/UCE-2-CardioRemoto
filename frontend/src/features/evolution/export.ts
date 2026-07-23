import type { LocalVisit } from '../../data/schema';
import { formatCpf } from '../../lib/cpf';
import { availableMetrics, metricValue } from './build';

export interface EvolutionExportInput {
  socialName: string;
  identifier: string;
  visits: LocalVisit[];
  now?: Date;
}

/** Excel em pt-BR usa `;` como separador de lista (a vírgula é separador decimal). */
const SEP = ';';

function escape(field: string): string {
  return /[";\r\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field;
}

function linha(campos: string[]): string {
  return campos.map((c) => escape(c)).join(SEP);
}

const dd = (n: number) => String(n).padStart(2, '0');

function dataBR(iso: string): string {
  const d = new Date(iso);
  return `${dd(d.getUTCDate())}/${dd(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

function dataHoraBR(d: Date): string {
  return `${dd(d.getDate())}/${dd(d.getMonth() + 1)}/${d.getFullYear()} ${dd(d.getHours())}:${dd(d.getMinutes())}`;
}

/**
 * Planilha da tabela de evolução (UC06), no mesmo recorte exibido na tela: uma linha por dado
 * coletado e uma coluna por data de visita (mais recente primeiro). Células sem coleta ficam
 * vazias — e não "—" — para a planilha não tratá-las como texto.
 */
export function buildEvolutionCsv({ socialName, identifier, visits, now = new Date() }: EvolutionExportInput): string {
  const colunas = [...visits].sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime());
  const metricas = availableMetrics(visits);

  const linhas = [
    linha(['CardioRemoto — evolução do paciente']),
    linha(['Paciente', socialName]),
    linha(['CPF', formatCpf(identifier)]),
    linha(['Exportado em', dataHoraBR(now)]),
    linha(['Visitas', String(colunas.length)]),
    '',
    linha(['Grupo', 'Dado', 'Unidade', ...colunas.map((v) => dataBR(v.collectedAt))]),
  ];

  for (const def of metricas) {
    linhas.push(
      linha([
        def.group,
        def.label,
        def.unit,
        ...colunas.map((v) => metricValue(v.measurements, def.key)?.display ?? ''),
      ]),
    );
  }

  // CRLF: o formato que Excel e LibreOffice abrem sem ajuste.
  return linhas.join('\r\n');
}

function slug(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function evolutionFileName(socialName: string, now = new Date()): string {
  const data = `${now.getFullYear()}-${dd(now.getMonth() + 1)}-${dd(now.getDate())}`;
  return `evolucao-${slug(socialName) || 'paciente'}-${data}.csv`;
}

/**
 * Dispara o download local do arquivo. O BOM (U+FEFF) é o que faz o Excel reconhecer UTF-8 e
 * exibir os acentos corretamente. Tudo acontece no dispositivo — funciona offline.
 */
export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
