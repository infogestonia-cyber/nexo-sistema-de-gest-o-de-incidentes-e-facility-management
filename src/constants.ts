import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CATEGORIES = [
  'Canalização',
  'Civil',
  'Carpintaria',
  'Cozinha',
  'Eléctrico',
  'Serralharia',
  'Refrigeração'
];

export const SEVERITIES = ['Baixa', 'Médio', 'Alto', 'Crítico'];

export const STATUSES = [
  'Aberto',
  'Atribuído',
  'Em progresso',
  'Em validação',
  'Resolvido',
  'Fechado'
];

export const ASSET_CATEGORIES = [
  'Civil',
  'AVAC',
  'Electricidade',
  'Segurança',
  'Águas e Esgotos'
];

export const INVENTORY_CATEGORIES = [
  'Ferramentas',
  'Peças de Substituição',
  'Consumíveis',
  'Equipamento de Proteção (EPI)',
  'Lubrificantes',
  'Outros'
];
