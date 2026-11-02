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
  fornecedorId?: number;
  fornecedorNome?: string;
  deletada?: boolean;
  garantia?: boolean;
}

export interface Tecnico {
  id: number;
  nome: string;
  especialidade: string;
  username: string;
  senha: string;
  cargo: 'Administrador' | 'Técnico / Atendente';
}
