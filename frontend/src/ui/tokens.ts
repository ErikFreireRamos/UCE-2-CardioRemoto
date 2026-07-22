/** Tokens de design extraídos do protótipo aprovado (Direção D). */

export const colors = {
  bg: '#FAF5EE',
  teal: '#0F5750',
  tealDark: '#0C443E',
  coral: '#E2725B',
  text: '#23170E',
  textMuted: '#9A8C7C',
  textSoft: '#5A4E42',
  headerSub: '#A7D7CF',
  fieldBg: '#FAF7F2',
  fieldBorder: '#ECE3D6',
  cardBg: '#ffffff',
  divider: '#F2EADE',
  sand: '#F2EAE0',
} as const;

export type RiskKey = 'verde' | 'amarelo' | 'vermelho' | 'sem_dados';

export const risk: Record<RiskKey, { dot: string; text: string; bg: string; label: string }> = {
  verde: { dot: '#16A34A', text: '#1B7A3E', bg: '#E6F4EA', label: 'Verde' },
  amarelo: { dot: '#E6A100', text: '#9A6B00', bg: '#FBF3DF', label: 'Amarelo' },
  vermelho: { dot: '#DC2626', text: '#C7322B', bg: '#FBEDEC', label: 'Vermelho' },
  sem_dados: { dot: '#9A8C7C', text: '#6B5E50', bg: '#EFEAE1', label: 'Sem dados' },
};

/** Estado visual de campo (normal / alerta amarelo / alerta vermelho). */
export const field = {
  normal: { bg: colors.fieldBg, border: colors.fieldBorder, color: colors.text },
  amber: { bg: '#FFFBF0', border: '#E6CE94', color: '#9A6B00' },
  red: { bg: '#FFF5F4', border: '#E9A39C', color: '#C7322B' },
} as const;

export const fonts = {
  serif: "'Newsreader', Georgia, serif",
  sans: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
} as const;

export const radius = { card: 16, chip: 999, field: 12, avatar: 14 } as const;

export const shadow = {
  card: '0 4px 16px -8px rgba(80,60,40,.22)',
  fab: '0 14px 26px -8px rgba(226,114,91,.7)',
  sheet: '0 -8px 30px -12px rgba(0,0,0,.25)',
} as const;
