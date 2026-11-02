export type StatusOS = 'Em Análise' | 'Aguardando Aprovação' | 'Aguardando Peça' | 'Em Manutenção' | 'Pronto' | 'Entregue';

export interface OrdemServico {
  id: number;
  cliente: string;
  whatsapp: string;
  cpf: string;
  tipo: 'Celular' | 'Tablet' | 'Notebook';
  marca: string;
  modelo: string;
  imeiSerial: string;
  tipoSenha: 'pin' | 'padrao';
  senha: string;
  acessorios: string;
  checklist: Record<string, boolean>;
  defeito: string;
  laudo: string;
  status: StatusOS;
  formaPagamento?: 'Pix' | 'Débito' | 'Crédito';
  valorPecas: number;
  valorMaoDeObra: number;
  dataEntrada: string;
  fotosEntrada: string[];
  fotosSaida: string[];
  tecnicoId: number;
  tecnicoNome: string;
  deletada?: boolean;
}

export interface Tecnico {
  id: number;
  nome: string;
  especialidade: string;
  username: string;
  senha: string;
  cargo: 'Administrador' | 'Técnico / Atendente';
}

export interface PecaEstoque {
  id: number;
  nome: string;
  categoria: string;
  quantidade: number;
  minimo: number;
  precoCusto: number;
  precoVenda: number;
}

export interface ConfiguracaoPix {
  tipoChave: string;
  chave: string;
  favorecido: string;
  cidade: string;
  qrCodeUrl: string;
}

export interface DestinoCamera {
  origem: 'nova-os' | 'os-existente';
  osId?: number;
  etapa: 'entrada' | 'saida';
}