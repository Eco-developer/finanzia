import { FinancialExperienceLevel, FINANCIAL_EXPERIENCE_LEVELS } from '../profile/profile.types';

export { FINANCIAL_EXPERIENCE_LEVELS };

export interface OnboardingGoalOption {
  id: string;
  title: string;
  description: string;
  iconName: string;
  isAi?: boolean;
}

export const ONBOARDING_GOALS: OnboardingGoalOption[] = [
  {
    id: 'control_expenses',
    title: 'Control de ingresos y gastos',
    description: 'Registrar y clasificar cada movimiento para saber a dónde va mi dinero.',
    iconName: 'Receipt',
  },
  {
    id: 'manage_budgets',
    title: 'Manejar mis presupuestos',
    description: 'Fijar límites mensuales por categoría para evitar gastos imprevistos.',
    iconName: 'PieChart',
  },
  {
    id: 'savings_goals',
    title: 'Crear metas de ahorro',
    description: 'Definir objetivos concretos para vacaciones, fondo o compras importantes.',
    iconName: 'Target',
  },
  {
    id: 'pay_debts',
    title: 'Pagar y amortizar mis deudas',
    description: 'Estructurar una estrategia acelerada (avalancha / bola de nieve) para liberarme de deudas.',
    iconName: 'TrendingDown',
  },
  {
    id: 'ai_expense_optimization',
    title: 'Optimización de gastos con IA',
    description: 'Recibir sugerencias automatizadas y detección de fugas de dinero por el Asistente IA.',
    iconName: 'Sparkles',
    isAi: true,
  },
  {
    id: 'other',
    title: 'Otros motivos específicos',
    description: 'Cuéntanos con tus propias palabras qué te gustaría lograr.',
    iconName: 'PlusCircle',
  },
];

export const SALARY_RANGES = [
  { value: 'under_15k', label: 'Menos de 15.000 € / año' },
  { value: '15k_30k', label: '15.000 € - 30.000 € / año' },
  { value: '30k_50k', label: '30.000 € - 50.000 € / año' },
  { value: '50k_80k', label: '50.000 € - 80.000 € / año' },
  { value: 'over_80k', label: 'Más de 80.000 € / año' },
  { value: 'undisclosed', label: 'Prefiero no especificarlo' },
];

export const EMERGENCY_FUND_RANGES = [
  { value: 'none', label: 'Aún no dispongo de fondo de reserva' },
  { value: 'under_3m', label: 'Menos de 3 meses de gastos habituales' },
  { value: '3m_6m', label: 'Entre 3 y 6 meses de gastos habituales' },
  { value: 'over_6m', label: 'Más de 6 meses de gastos habituales' },
];

export const EXPERIENCE_LEVELS = [
  {
    value: 'BEGINNER',
    title: 'Principiante',
    description: 'Busco explicaciones sencillas, claras y sin jerga técnica.',
  },
  {
    value: 'INTERMEDIATE',
    title: 'Intermedio',
    description: 'Comprendo conceptos habituales como liquidez, amortización y TAE.',
  },
  {
    value: 'ADVANCED',
    title: 'Avanzado',
    description: 'Familiarizado con diversificación, rentabilidad ajustada a riesgo y balances.',
  },
];
