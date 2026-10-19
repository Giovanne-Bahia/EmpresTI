export type Equipment = {
  name: string
  asset: string
  category: string
  icon: string
  status: 'Disponível' | 'Emprestado' | 'Manutenção'
  description: string
  note: string
}

export const equipment: Equipment[] = [
  {
    name: 'MacBook Pro 14″',
    asset: 'PAT-1042',
    category: 'Notebooks',
    icon: 'laptop',
    status: 'Disponível',
    description: 'Apple M3 Pro · 18 GB RAM · 512 GB SSD',
    note: 'Retirada no suporte · 2º andar',
  },
  {
    name: 'Dell UltraSharp 27″',
    asset: 'PAT-0871',
    category: 'Monitores',
    icon: 'monitor',
    status: 'Disponível',
    description: 'Resolução 4K · USB-C · Ajuste de altura',
    note: 'Retirada no suporte · 2º andar',
  },
  {
    name: 'Sony A7 III',
    asset: 'PAT-0233',
    category: 'Câmeras',
    icon: 'video-camera',
    status: 'Emprestado',
    description: 'Full frame · Lente 28–70 mm · Kit completo',
    note: 'Empréstimo de exemplo · devolve 28/out',
  },
  {
    name: 'ThinkPad T14',
    asset: 'PAT-1188',
    category: 'Notebooks',
    icon: 'laptop',
    status: 'Emprestado',
    description: 'Intel Core i7 · 16 GB RAM · 512 GB SSD',
    note: 'Empréstimo de exemplo · devolve 26/out',
  },
  {
    name: 'Dock USB-C Anker',
    asset: 'PAT-0455',
    category: 'Acessórios',
    icon: 'usb',
    status: 'Disponível',
    description: '8 conexões · HDMI 4K · Power Delivery',
    note: 'Retirada no suporte · 2º andar',
  },
  {
    name: 'LG UltraFine 24″',
    asset: 'PAT-0910',
    category: 'Monitores',
    icon: 'monitor',
    status: 'Manutenção',
    description: 'Resolução Full HD · IPS · HDMI',
    note: 'Em avaliação pela assistência técnica',
  },
  {
    name: 'MacBook Air 13″ M2',
    asset: 'PAT-1204',
    category: 'Notebooks',
    icon: 'laptop',
    status: 'Disponível',
    description: 'Apple M2 · 8 GB RAM · 256 GB SSD',
    note: 'Retirada no suporte · 2º andar',
  },
  {
    name: 'Projetor Epson X49',
    asset: 'PAT-0102',
    category: 'Projetores',
    icon: 'projector-screen',
    status: 'Disponível',
    description: '3.600 lumens · HDMI · Controle remoto',
    note: 'Retirada no suporte · 2º andar',
  },
  {
    name: 'Adaptador HDMI Belkin',
    asset: 'PAT-0338',
    category: 'Acessórios',
    icon: 'usb',
    status: 'Disponível',
    description: 'USB-C para HDMI · Resolução até 4K',
    note: 'Retirada no suporte · 2º andar',
  },
]

export function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}
