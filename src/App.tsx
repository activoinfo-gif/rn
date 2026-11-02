import React, { useState, useEffect, useRef } from 'react';
// @ts-ignore
import html2pdf from 'html2pdf.js';import {
  PlusCircle, ClipboardList, Package, LayoutDashboard,
  Smartphone, Tablet, Laptop, MessageCircle, Printer, Trash2,
  CheckSquare, Camera, X, RefreshCw, Upload,
  Lock, Hash, Grid, ShieldCheck, UserCheck, Edit3, Sun, Moon, LogOut, DollarSign, QrCode, RotateCcw, Settings, Download, AlertTriangle, Search, FileText, Bell, Truck
} from 'lucide-react';

type StatusOS = 'Em Análise' | 'Aguardando Aprovação' | 'Aguardando Peça' | 'Em Manutenção' | 'Pronto' | 'Entregue';

interface OrdemServico {
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
  lojista?: boolean;
}

interface Tecnico {
  id: number;
  nome: string;
  especialidade: string;
  username: string;
  senha: string;
  cargo: 'Administrador' | 'Técnico / Atendente';
}

interface Fornecedor {
  id: number;
  nome: string;
  contato: string;
  observacao: string;
}

interface PecaEstoque {
  id: number;
  nome: string;
  categoria: string;
  quantidade: number;
  minimo: number;
  precoCusto: number;
  precoVenda: number;
}

interface ConfiguracaoPix {
  tipoChave: string;
  chave: string;
  favorecido: string;
  cidade: string;
  qrCodeUrl: string;
}

interface DestinoCamera {
  origem: 'nova-os' | 'os-existente';
  osId?: number;
  etapa: 'entrada' | 'saida';
}

const ITENS_CHECKLIST = [
  'Aparelho Liga', 'Tela Intacta', 'Touch Funciona', 'Câmeras OK',
  'Botões Físicos OK', 'Carregando Normal', 'Wi-Fi / Rede OK', 'Sinais de Oxidação/Líquido'
];

const BANCO_APARELHOS: Record<string, { marcas: string[], modelos: Record<string, string[]> }> = {
  Celular: {
    marcas: ['Apple', 'Samsung', 'Motorola', 'Xiaomi', 'LG', 'Asus'],
    modelos: {
      Apple: ['iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16', 'iPhone 15 Pro Max', 'iPhone 15', 'iPhone 14', 'iPhone 13'],
      Samsung: ['Galaxy S25 Ultra', 'Galaxy S25+', 'Galaxy S24 Ultra', 'Galaxy S23', 'Galaxy A55', 'Galaxy A35', 'Galaxy A15'],
      Motorola: ['Moto Edge 50 Pro', 'Moto G85', 'Moto G54', 'Razr 50 Ultra'],
      Xiaomi: ['Xiaomi 14', 'Redmi Note 13', 'Redmi Note 14', 'Poco X6 Pro', 'Poco F6'],
      LG: ['K62', 'Velvet', 'G8X ThinQ'],
      Asus: ['Zenfone 10', 'ROG Phone 8']
    }
  },
  Tablet: {
    marcas: ['Apple (iPad)', 'Samsung', 'Lenovo', 'Xiaomi'],
    modelos: {
      'Apple (iPad)': ['iPad Pro M4', 'iPad Air M2', 'iPad 11', 'iPad Mini A17 Pro'],
      Samsung: ['Galaxy Tab S11', 'Galaxy Tab S10 FE', 'Galaxy Tab A11+', 'Galaxy Tab A9+'],
      Lenovo: ['Tab P12', 'Tab M11', 'Idea Tab'],
      Xiaomi: ['Xiaomi Pad 7', 'Redmi Pad 2', 'Pad 6']
    }
  },
  Notebook: {
    marcas: ['Apple (MacBook)', 'Dell', 'Acer', 'Lenovo', 'HP', 'Asus'],
    modelos: {
      'Apple (MacBook)': ['MacBook Pro M3', 'MacBook Air M3', 'MacBook Air M2'],
      Dell: ['Inspiron 15', 'Latitude 3420', 'XPS 13', 'Alienware m16'],
      Acer: ['Nitro 5', 'Nitro V15', 'Aspire 5', 'Predator Helios'],
      Lenovo: ['IdeaPad 3', 'IdeaPad Gaming 3', 'ThinkPad E14', 'Yoga Slim 7'],
      HP: ['Pavilion x360', 'ProBook 440', 'Victus 15'],
      Asus: ['ZenBook 14', 'TUF Gaming F15', 'ROG Strix G16']
    }
  }
};

const validarCPF = (cpfStr: string): boolean => {
  const cpf = cpfStr.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  let digito1 = resto === 10 || resto === 11 ? 0 : resto;

  if (digito1 !== parseInt(cpf.charAt(9))) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  let digito2 = resto === 10 || resto === 11 ? 0 : resto;

  return digito2 === parseInt(cpf.charAt(10));
};

const formatarChavePix = (tipo: string, valor: string): string => {
  const nums = valor.replace(/\D/g, '');
  if (tipo === 'CPF') {
    return nums
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .slice(0, 14);
  }
  if (tipo === 'CNPJ') {
    return nums
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})/, '$1-$2')
      .slice(0, 18);
  }
  if (tipo === 'Telefone') {
    return nums
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  }
  return valor;
};

const formatarMoedaInput = (valor: number): string => {
  if (!valor || isNaN(valor)) return '';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const converterMoedaParaNumero = (texto: string): number => {
  const apenasNums = texto.replace(/\D/g, '');
  if (!apenasNums) return 0;
  return Number(apenasNums) / 100;
};

const formatarTitulo = (texto: string): string => {
  if (!texto) return '';
  return texto.toUpperCase();
};

const comprimirImagem = (arquivo: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.readAsDataURL(arquivo);
    leitor.onload = (evento) => {
      const img = new Image();
      img.src = evento.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const LARGURA_MAX = 800;
        const escala = img.width > LARGURA_MAX ? LARGURA_MAX / img.width : 1;
        canvas.width = img.width * escala;
        canvas.height = img.height * escala;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = (erro) => reject(erro);
    };
    leitor.onerror = (erro) => reject(erro);
  });
};

const LOGO_PADRAO_TECH_ASSISTENCIA = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 420" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#060913" />
      <stop offset="100%" stop-color="#0b1021" />
    </linearGradient>
    <linearGradient id="topGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#9333ea" />
      <stop offset="50%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#c084fc" />
    </linearGradient>
    <linearGradient id="midGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#93c5fd" />
    </linearGradient>
    <linearGradient id="botGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#2dd4bf" />
      <stop offset="50%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#a5f3fc" />
    </linearGradient>
    <linearGradient id="leftGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#9333ea" />
      <stop offset="50%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#2dd4bf" />
    </linearGradient>
    <radialGradient id="sphereGrad" cx="40%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#1e40af" stop-opacity="0.7" />
      <stop offset="60%" stop-color="#0f172a" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#020617" stop-opacity="1" />
    </radialGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <rect width="500" height="420" rx="28" fill="url(#bgGrad)" />
  <circle cx="250" cy="155" r="88" fill="url(#sphereGrad)" stroke="#1e3a8a" stroke-width="2" />
  <path d="M 185 85 C 198 105, 198 135, 185 155 C 198 175, 198 205, 185 225 L 165 225 C 178 205, 178 175, 165 155 C 178 135, 178 105, 165 85 Z" fill="url(#leftGrad)" opacity="0.85" />
  <path d="M 175 70 C 200 70, 225 55, 250 55 C 275 55, 300 70, 325 70 L 325 100 C 300 100, 275 115, 250 115 C 225 115, 200 100, 175 100 Z" fill="url(#topGrad)" />
  <circle cx="175" cy="85" r="24" fill="url(#topGrad)" filter="url(#glow)" />
  <circle cx="250" cy="85" r="22" fill="url(#topGrad)" />
  <circle cx="325" cy="85" r="25" fill="url(#topGrad)" filter="url(#glow)" />
  <path d="M 175 140 C 200 140, 225 128, 250 128 L 250 182 C 225 182, 200 170, 175 170 Z" fill="url(#midGrad)" />
  <circle cx="175" cy="155" r="22" fill="url(#midGrad)" />
  <circle cx="250" cy="155" r="25" fill="url(#midGrad)" filter="url(#glow)" />
  <circle cx="325" cy="155" r="25" fill="url(#midGrad)" filter="url(#glow)" />
  <path d="M 175 210 C 200 210, 225 195, 250 195 C 275 195, 300 210, 325 210 L 325 240 C 300 240, 275 255, 250 255 C 225 255, 200 240, 175 240 Z" fill="url(#botGrad)" />
  <circle cx="175" cy="225" r="25" fill="url(#botGrad)" filter="url(#glow)" />
  <circle cx="250" cy="225" r="22" fill="url(#botGrad)" />
  <circle cx="325" cy="225" r="25" fill="url(#botGrad)" filter="url(#glow)" />
  <circle cx="328" cy="80" r="10" fill="#ffffff" opacity="0.35" />
  <circle cx="253" cy="150" r="10" fill="#ffffff" opacity="0.4" />
  <circle cx="328" cy="150" r="10" fill="#ffffff" opacity="0.4" />
  <circle cx="328" cy="220" r="10" fill="#ffffff" opacity="0.45" />
  <text x="250" y="328" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="42" fill="url(#botGrad)" letter-spacing="6" text-anchor="middle" filter="url(#glow)">TECH</text>
  <text x="250" y="368" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="22" fill="#a5b4fc" letter-spacing="9" text-anchor="middle">ASSISTENCIA</text>
</svg>
`);

export default function App() {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>(() => {
    const salvo = localStorage.getItem('assistencia_tecnicos');
    return salvo ? JSON.parse(salvo) : [
      { id: 1, nome: 'Administrador', especialidade: 'Geral', username: 'admin', senha: '123', cargo: 'Administrador' }
    ];
  });

  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(() => {
    const salvo = localStorage.getItem('assistencia_fornecedores');
    return salvo ? JSON.parse(salvo) : [];
  });

  const [usuarioLogado, setUsuarioLogado] = useState<Tecnico | null>(null);
  const [inputUser, setInputUser] = useState('');
  const [inputPass, setInputPass] = useState('');

  const [modoNoturno, setModoNoturno] = useState<boolean>(() => localStorage.getItem('tech_modo_noturno') === 'true');
  const [logoAltura, setLogoAltura] = useState<number>(() => Number(localStorage.getItem('tech_logo_altura')) || 95);
  
  const [logoCustomizado, setLogoCustomizado] = useState<string>(() => {
    const salvo = localStorage.getItem('tech_logo_custom');
    if (!salvo || salvo === '/logo rn.webp') return LOGO_PADRAO_TECH_ASSISTENCIA;
    return salvo;
  });

  const [nomeEmpresa, setNomeEmpresa] = useState<string>(() => localStorage.getItem('tech_nome_empresa') || 'TECH ASSISTENCIA');
  const [numeroInicialOS, setNumeroInicialOS] = useState<number>(() => Number(localStorage.getItem('tech_numero_inicial_os')) || 1001);

  const [configPix, setConfigPix] = useState<ConfiguracaoPix>(() => {
    const salvo = localStorage.getItem('tech_config_pix');
    return salvo ? JSON.parse(salvo) : {
      tipoChave: 'CNPJ', chave: '', favorecido: '', cidade: '', qrCodeUrl: ''
    };
  });

  const [abaAtiva, setAbaAtiva] = useState<'dashboard' | 'ordens' | 'nova-os' | 'estoque' | 'tecnicos' | 'financeiro' | 'configuracoes'>('dashboard');
  const [filtroOrdens, setFiltroOrdens] = useState<'ativas' | 'lixeira'>('ativas');
  const [termoBuscaDash, setTermoBuscaDash] = useState('');
  const [termoBuscaPeca, setTermoBuscaPeca] = useState('');
  const [osParaImprimir, setOsParaImprimir] = useState<OrdemServico | null>(null);
  const [formatoImpressao, setFormatoImpressao] = useState<'A4' | '80mm'>('A4');
  const [incluirFotosImpressao, setIncluirFotosImpressao] = useState(true);

  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);
  const [osPendentePagamentoId, setOsPendentePagamentoId] = useState<number | null>(null);
  const [modalAdminAberto, setModalAdminAberto] = useState(false);
  const [tentativaAdminUser, setTentativaAdminUser] = useState('');
  const [tentativaAdminPass, setTentativaAdminPass] = useState('');
  const [acaoPendenteAdmin, setAcaoPendenteAdmin] = useState<(() => void) | null>(null);

  const [osEmEdicaoId, setOsEmEdicaoId] = useState<number | null>(null);
  const [pecaEmEdicaoId, setPecaEmEdicaoId] = useState<number | null>(null);
  const [osParaFotos, setOsParaFotos] = useState<OrdemServico | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);
  const [destinoCamera, setDestinoCamera] = useState<DestinoCamera | null>(null);
  const [modoCamera, setModoCamera] = useState<'environment' | 'user'>('environment');
  const [erroCamera, setErroCamera] = useState<string | null>(null);
  const [flashAtivo, setFlashAtivo] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [padraoSelecionado, setPadraoSelecionado] = useState<number[]>([]);
  const [desenhandoPadrao, setDesenhandoPadrao] = useState(false);
  const gridPadraoRef = useRef<HTMLDivElement | null>(null);

  const [novoTecnico, setNovoTecnico] = useState({
    nome: '',
    especialidade: '',
    username: '',
    senha: '',
    cargo: 'Técnico / Atendente' as 'Administrador' | 'Técnico / Atendente'
  });

  const [novoFornecedor, setNovoFornecedor] = useState({
    nome: '',
    contato: '',
    observacao: ''
  });

  const [ordens, setOrdens] = useState<OrdemServico[]>(() => {
    const salvo = localStorage.getItem('assistencia_os');
    if (salvo) {
      try {
        return JSON.parse(salvo);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [estoque, setEstoque] = useState<PecaEstoque[]>(() => {
    const salvo = localStorage.getItem('assistencia_estoque');
    return salvo ? JSON.parse(salvo) : [];
  });

  const [novaOS, setNovaOS] = useState({
    cliente: '', whatsapp: '', cpf: '', tipo: 'Celular' as 'Celular' | 'Tablet' | 'Notebook',
    marca: 'Apple', modelo: '', imeiSerial: '', tipoSenha: 'pin' as 'pin' | 'padrao', senha: '', acessorios: '', defeito: '', laudo: '',
    valorPecas: 0, valorMaoDeObra: 0, tecnicoId: 1, fornecedorId: '' as string | number,
    lojista: false,
    checklist: ITENS_CHECKLIST.reduce((acc, item) => ({ ...acc, [item]: false }), {} as Record<string, boolean>),
    fotosEntrada: [] as string[]
  });

  const [novaPeca, setNovaPeca] = useState({
    nome: '', categoria: 'Celular', quantidade: 1, minimo: 2, precoCusto: 0, precoVenda: 0
  });

  useEffect(() => { localStorage.setItem('assistencia_os', JSON.stringify(ordens)); }, [ordens]);
  useEffect(() => { localStorage.setItem('assistencia_estoque', JSON.stringify(estoque)); }, [estoque]);
  useEffect(() => { localStorage.setItem('assistencia_tecnicos', JSON.stringify(tecnicos)); }, [tecnicos]);
  useEffect(() => { localStorage.setItem('assistencia_fornecedores', JSON.stringify(fornecedores)); }, [fornecedores]);
  useEffect(() => { localStorage.setItem('tech_modo_noturno', String(modoNoturno)); }, [modoNoturno]);
  useEffect(() => { localStorage.setItem('tech_config_pix', JSON.stringify(configPix)); }, [configPix]);
  useEffect(() => { localStorage.setItem('tech_logo_altura', String(logoAltura)); }, [logoAltura]);
  useEffect(() => { localStorage.setItem('tech_logo_custom', logoCustomizado); }, [logoCustomizado]);
  useEffect(() => { localStorage.setItem('tech_nome_empresa', nomeEmpresa); }, [nomeEmpresa]);
  useEffect(() => { localStorage.setItem('tech_numero_inicial_os', String(numeroInicialOS)); }, [numeroInicialOS]);

  const [popupProntosAberto, setPopupProntosAberto] = useState(false);

  useEffect(() => {
    if (usuarioLogado) {
      const qtdProntas = ordens.filter(o => !o.deletada && o.status === 'Pronto').length;
      if (qtdProntas > 0) {
        setPopupProntosAberto(true);
      }
    }
  }, [usuarioLogado, ordens]);

  useEffect(() => {
    let streamAtual: MediaStream | null = null;
    if (destinoCamera) {
      setErroCamera(null);
      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: { ideal: modoCamera }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        })
        .catch(() => navigator.mediaDevices.getUserMedia({ video: true, audio: false }))
        .then((stream) => {
          streamAtual = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(() => {
          setErroCamera('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
        });
    }
    return () => {
      if (streamAtual) streamAtual.getTracks().forEach((track) => track.stop());
    };
  }, [destinoCamera, modoCamera]);

  const capturarFotoDaCamera = () => {
    if (!videoRef.current || !destinoCamera) return;
    const video = videoRef.current;
    if (video.videoWidth === 0) return;

    const canvas = document.createElement('canvas');
    const LARGURA_MAX = 800;
    const escala = video.videoWidth > LARGURA_MAX ? LARGURA_MAX / video.videoWidth : 1;
    canvas.width = video.videoWidth * escala;
    canvas.height = video.videoHeight * escala;

    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const fotoBase64 = canvas.toDataURL('image/jpeg', 0.75);

    setFlashAtivo(true);
    setTimeout(() => setFlashAtivo(false), 150);

    if (destinoCamera.origem === 'nova-os') {
      setNovaOS((prev) => ({ ...prev, fotosEntrada: [...prev.fotosEntrada, fotoBase64] }));
    } else if (destinoCamera.origem === 'os-existente' && destinoCamera.osId) {
      setOrdens((prevOrdens) =>
        prevOrdens.map((os) => {
          if (os.id !== destinoCamera.osId) return os;
          const atualizada = {
            ...os,
            fotosEntrada: destinoCamera.etapa === 'entrada' ? [...(os.fotosEntrada || []), fotoBase64] : os.fotosEntrada || [],
            fotosSaida: destinoCamera.etapa === 'saida' ? [...(os.fotosSaida || []), fotoBase64] : os.fotosSaida || []
          };
          setOsParaFotos(atualizada);
          return atualizada;
        })
      );
    }
  };

  const adicionarFotosNovaOS = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const arquivos = Array.from(e.target.files);
    const fotosComprimidas = await Promise.all(arquivos.map(arq => comprimirImagem(arq)));
    setNovaOS(prev => ({ ...prev, fotosEntrada: [...prev.fotosEntrada, ...fotosComprimidas] }));
    e.target.value = '';
  };

  const importarLogoSistema = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const arquivo = e.target.files[0];
    try {
      const base64 = await comprimirImagem(arquivo);
      setLogoCustomizado(base64);
      alert('Logo importado e salvo com sucesso no sistema!');
    } catch {
      alert('Erro ao carregar a imagem do logo.');
    }
    e.target.value = '';
  };

  const restaurarLogoPadrao = () => {
    setLogoCustomizado(LOGO_PADRAO_TECH_ASSISTENCIA);
    setNomeEmpresa('TECH ASSISTENCIA');
    alert('Logo e nome padrão (TECH ASSISTENCIA) restaurados!');
  };

  const importarQrCodePix = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const arquivo = e.target.files[0];
    try {
      const base64 = await comprimirImagem(arquivo);
      setConfigPix(prev => ({ ...prev, qrCodeUrl: base64 }));
      alert('QR Code do Pix importado com sucesso!');
    } catch {
      alert('Erro ao carregar a imagem do QR Code.');
    }
    e.target.value = '';
  };

  const baixarArquivoBackup = (silencioso = false) => {
    try {
      const dadosBackup = {
        versao: "1.0.0",
        dataBackup: new Date().toISOString(),
        ordens,
        estoque,
        tecnicos,
        fornecedores,
        configPix,
        logoCustomizado,
        logoAltura,
        nomeEmpresa,
        numeroInicialOS
      };

      const jsonStr = JSON.stringify(dadosBackup, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_${nomeEmpresa.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (!silencioso) {
        alert('Backup completo do sistema concluído e download realizado com sucesso!');
      }
      return true;
    } catch {
      if (!silencioso) {
        alert('Erro ao gerar o backup do sistema.');
      }
      return false;
    }
  };

  const criarBackupSistema = () => {
    baixarArquivoBackup(false);
  };

  const restaurarBackupSistema = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const arquivo = e.target.files[0];
    const leitor = new FileReader();
    leitor.onload = (evento) => {
      try {
        const dados = JSON.parse(evento.target?.result as string);
        if (dados.ordens && dados.estoque) {
          if (confirm('Deseja restaurar os dados do backup? Isso substituirá todos os registros atuais.')) {
            setOrdens(dados.ordens);
            setEstoque(dados.estoque);
            if (dados.tecnicos) setTecnicos(dados.tecnicos);
            if (dados.fornecedores) setFornecedores(dados.fornecedores);
            if (dados.configPix) setConfigPix(dados.configPix);
            if (dados.logoCustomizado) setLogoCustomizado(dados.logoCustomizado);
            if (dados.logoAltura) setLogoAltura(dados.logoAltura);
            if (dados.nomeEmpresa) setNomeEmpresa(dados.nomeEmpresa);
            if (dados.numeroInicialOS) setNumeroInicialOS(dados.numeroInicialOS);
            alert('Backup restaurado com sucesso!');
          }
        } else {
          alert('Arquivo de backup inválido ou incompatível.');
        }
      } catch (err) {
        alert('Erro ao processar o arquivo JSON de backup.');
      }
      e.target.value = '';
    };
    leitor.readAsText(arquivo);
  };

  const resetarSistema = () => {
    if (confirm('ATENÇÃO: Deseja realmente zerar e resetar o sistema? Um backup automático será baixado no seu navegador antes de apagar todos os dados e deixar o sistema totalmente zerado!')) {
      if (confirm('Tem certeza absoluta? Clique em OK para baixar o backup automático e limpar todos os dados.')) {
        baixarArquivoBackup(true);

        setTimeout(() => {
          localStorage.clear();
          alert('Backup automático baixado e sistema limpo e resetado com sucesso! A página será recarregada.');
          window.location.reload();
        }, 500);
      }
    }
  };

  const atualizarStatus = (id: number, novoStatus: StatusOS) => {
    if (novoStatus === 'Entregue') {
      setOsPendentePagamentoId(id);
      setModalPagamentoAberto(true);
    } else {
      setOrdens(ordens.map(o => o.id === id ? { ...o, status: novoStatus } : o));
    }
  };

  const confirmarFormaPagamento = (forma: 'Pix' | 'Débito' | 'Crédito') => {
    if (osPendentePagamentoId !== null) {
      setOrdens(ordens.map(o => o.id === osPendentePagamentoId ? { ...o, status: 'Entregue', formaPagamento: forma } : o));
      setModalPagamentoAberto(false);
      setOsPendentePagamentoId(null);
    }
  };

  const reabrirComoGarantia = (id: number) => {
    if (confirm(`Deseja reabrir a OS #${id} como Garantia? O status voltará para "Em Análise".`)) {
      setOrdens(ordens.map(o => o.id === id ? { 
        ...o, 
        status: 'Em Análise', 
        garantia: true,
        laudo: (o.laudo ? o.laudo + '\n' : '') + 'Reaberto em Garantia em ' + new Date().toLocaleDateString('pt-BR') 
      } : o));
    }
  };

  const imprimirEmNovaJanela = (os: OrdemServico) => {
    const elemento = document.getElementById(`os-pdf-${os.id}`);
    if (!elemento) {
      alert('Abra a visualização de detalhes da OS antes de imprimir.');
      setOsParaImprimir(os);
      return;
    }

    const janelaPrint = window.open('', '_blank', 'width=800,height=600');
    if (!janelaPrint) {
      alert('Permita pop-ups no navegador para abrir a janela de impressão.');
      return;
    }

    janelaPrint.document.write(`
      <html>
        <head>
          <title>Ordem de Serviço #${os.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; background: #ffffff; }
            .container { max-width: 700px; margin: auto; border: 1px solid #cbd5e1; padding: 30px; border-radius: 12px; background: #ffffff; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px; }
            .header h2 { margin: 5px 0; font-size: 18px; }
            .header p { margin: 2px 0; font-size: 12px; color: #64748b; }
            .details p { margin: 6px 0; font-size: 13px; }
            .footer { text-align: center; margin-top: 40px; border-top: 1px solid #94a3b8; width: 250px; margin-left: auto; margin-right: auto; padding-top: 5px; font-size: 12px; }
            img { max-width: 100%; height: auto; border-radius: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            ${elemento.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    janelaPrint.document.close();
  };

  const gerarPdfEEnviarWhatsApp = (os: OrdemServico) => {
    const elemento = document.getElementById(`os-pdf-${os.id}`);
    if (!elemento) {
      alert('Abra a visualização de detalhes da OS antes de gerar o PDF.');
      setOsParaImprimir(os);
      return;
    }

    const opcoes = {
      margin: 10,
      filename: `OS_${os.id}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 800 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().from(elemento).set(opcoes).save().then(() => {
      const foneLimpo = os.whatsapp.replace(/\D/g, '');
      const foneComDDI = foneLimpo.startsWith('55') ? foneLimpo : `55${foneLimpo}`;
      const mensagem = `Olá *${os.cliente}*! Segue o PDF da Ordem de Serviço #${os.id} referente ao aparelho ${os.marca} ${os.modelo}. Obrigado pela preferência na ${nomeEmpresa}!`;
      window.open(`https://wa.me/${foneComDDI}?text=${encodeURIComponent(mensagem)}`, '_blank');
    });
  };

  const carregarParaEdicao = (os: OrdemServico) => {
    const concluida = os.status === 'Pronto' || os.status === 'Entregue';
    const acaoEdicao = () => {
      setNovaOS({
        cliente: os.cliente,
        whatsapp: os.whatsapp,
        cpf: os.cpf || '',
        tipo: os.tipo,
        marca: os.marca || 'Apple',
        modelo: os.modelo,
        imeiSerial: os.imeiSerial || '',
        tipoSenha: os.tipoSenha || 'pin',
        senha: os.senha || '',
        acessorios: os.acessorios || '',
        defeito: os.defeito,
        laudo: os.laudo || '',
        valorPecas: os.valorPecas || 0,
        valorMaoDeObra: os.valorMaoDeObra || 0,
        tecnicoId: os.tecnicoId || 1,
        fornecedorId: os.fornecedorId || '',
        lojista: os.lojista || false,
        checklist: os.checklist || ITENS_CHECKLIST.reduce((acc, item) => ({ ...acc, [item]: false }), {}),
        fotosEntrada: os.fotosEntrada || []
      });
      setOsEmEdicaoId(os.id);
      setAbaAtiva('nova-os');
    };

    if (concluida) {
      solicitarAdminForcado(acaoEdicao);
    } else {
      acaoEdicao();
    }
  };

  const iniciarNovaOSComCliente = (osExistente: OrdemServico) => {
    setOsEmEdicaoId(null);
    setNovaOS({
      cliente: osExistente.cliente,
      whatsapp: osExistente.whatsapp,
      cpf: osExistente.cpf || '',
      tipo: 'Celular',
      marca: 'Apple',
      modelo: '',
      imeiSerial: '',
      tipoSenha: 'pin',
      senha: '',
      acessorios: '',
      defeito: '',
      laudo: '',
      valorPecas: 0,
      valorMaoDeObra: 0,
      tecnicoId: usuarioLogado?.id || 1,
      fornecedorId: '',
      lojista: false,
      checklist: ITENS_CHECKLIST.reduce((acc, item) => ({ ...acc, [item]: false }), {}),
      fotosEntrada: []
    });
    setPadraoSelecionado([]);
    setAbaAtiva('nova-os');
  };

  const solicitarAdminForcado = (acao: () => void) => {
    if (usuarioLogado?.cargo === 'Administrador') {
      acao();
    } else {
      setAcaoPendenteAdmin(() => acao);
      setModalAdminAberto(true);
    }
  };

  const deletarOS = (id: number) => {
    solicitarAdminForcado(() => {
      if (confirm(`Deseja mover a OS #${id} para a lixeira?`)) {
        setOrdens(ordens.map(o => o.id === id ? { ...o, deletada: true } : o));
      }
    });
  };

  const restaurarOS = (id: number) => {
    solicitarAdminForcado(() => {
      setOrdens(ordens.map(o => o.id === id ? { ...o, deletada: false } : o));
    });
  };

  const lidarComToquePonto = (pontoId: number) => {
    if (!desenhandoPadrao) return;
    if (!padraoSelecionado.includes(pontoId)) {
      const novoPadrao = [...padraoSelecionado, pontoId];
      setPadraoSelecionado(novoPadrao);
      setNovaOS(prev => ({ ...prev, senha: `Padrão: ${novoPadrao.join(' → ')}` }));
    }
  };

  const iniciarDesenho = (pontoId: number) => {
    setDesenhandoPadrao(true);
    setPadraoSelecionado([pontoId]);
    setNovaOS(prev => ({ ...prev, senha: `Padrão: ${pontoId}` }));
  };

  const finalizarDesenho = () => setDesenhandoPadrao(false);
  const limparPadrao = () => { setPadraoSelecionado([]); setNovaOS(prev => ({ ...prev, senha: '' })); };

  const solicitarAdmin = (acao: () => void) => {
    if (usuarioLogado?.cargo === 'Administrador') {
      acao();
    } else {
      setAcaoPendenteAdmin(() => acao);
      setModalAdminAberto(true);
    }
  };

  const confirmarLoginAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const adminEncontrado = tecnicos.find(t => t.username && t.username.toLowerCase() === tentativaAdminUser.trim().toLowerCase() && t.senha === tentativaAdminPass && t.cargo === 'Administrador');
    if (adminEncontrado) {
      setModalAdminAberto(false);
      setTentativaAdminUser('');
      setTentativaAdminPass('');
      if (acaoPendenteAdmin) {
        acaoPendenteAdmin();
        setAcaoPendenteAdmin(null);
      }
    } else {
      alert('Acesso negado: Somente um Administrador pode realizar esta alteração ou exclusão!');
    }
  };

  const salvarNovaOS = (e: React.FormEvent) => {
    e.preventDefault();

    const wppLimpo = novaOS.whatsapp.replace(/\D/g, '');
    if (wppLimpo.length !== 11) {
      alert('O número de celular / WhatsApp deve conter exatamente 11 dígitos (com DDD e o 9º dígito, ex: 11988887777).');
      return;
    }

    if (novaOS.cpf.trim() !== '' && !validarCPF(novaOS.cpf)) {
      alert('Atenção: O CPF digitado é inválido ou falso. Verifique os números antes de salvar.');
      return;
    }

    const tecnicoSelecionado = tecnicos.find(t => t.id === Number(novaOS.tecnicoId)) || tecnicos[0];
    const fornecedorSelecionado = fornecedores.find(f => f.id === Number(novaOS.fornecedorId));

    if (osEmEdicaoId !== null) {
      setOrdens(ordens.map(o => o.id === osEmEdicaoId ? {
        ...o,
        ...novaOS,
        cliente: formatarTitulo(novaOS.cliente),
        marca: formatarTitulo(novaOS.marca),
        modelo: formatarTitulo(novaOS.modelo),
        tecnicoId: tecnicoSelecionado.id,
        tecnicoNome: tecnicoSelecionado.nome,
        fornecedorId: fornecedorSelecionado ? fornecedorSelecionado.id : undefined,
        fornecedorNome: fornecedorSelecionado ? fornecedorSelecionado.nome : undefined
      } : o));
      setOsEmEdicaoId(null);
    } else {
      const maiorIdExistente = ordens.length > 0 ? Math.max(...ordens.map(o => o.id)) : 0;
      const proximoId = Math.max(numeroInicialOS, maiorIdExistente + 1);

      const osCriada: OrdemServico = {
        ...novaOS,
        cliente: formatarTitulo(novaOS.cliente),
        marca: formatarTitulo(novaOS.marca),
        modelo: formatarTitulo(novaOS.modelo),
        id: proximoId,
        status: 'Em Análise',
        dataEntrada: new Date().toLocaleDateString('pt-BR'),
        fotosSaida: [],
        tecnicoId: tecnicoSelecionado ? tecnicoSelecionado.id : 1,
        tecnicoNome: tecnicoSelecionado ? tecnicoSelecionado.nome : 'Geral',
        fornecedorId: fornecedorSelecionado ? fornecedorSelecionado.id : undefined,
        fornecedorNome: fornecedorSelecionado ? fornecedorSelecionado.nome : undefined,
        deletada: false,
        garantia: false,
        lojista: novaOS.lojista
      };
      setOrdens([osCriada, ...ordens]);
    }

    setNovaOS({
      cliente: '', whatsapp: '', cpf: '', tipo: 'Celular', marca: 'Apple', modelo: '', imeiSerial: '',
      tipoSenha: 'pin', senha: '', acessorios: '', defeito: '', laudo: '', valorPecas: 0, valorMaoDeObra: 0,
      tecnicoId: tecnicos[0]?.id || 1, fornecedorId: '', lojista: false,
      checklist: ITENS_CHECKLIST.reduce((acc, item) => ({ ...acc, [item]: false }), {} as Record<string, boolean>),
      fotosEntrada: []
    });
    setPadraoSelecionado([]);
    setAbaAtiva('ordens');
  };

  const adicionarTecnico = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTecnico.nome || !novoTecnico.username || !novoTecnico.senha) {
      alert('Preencha o Nome, Usuário e Senha do técnico.');
      return;
    }
    if (tecnicos.some(t => t.username && t.username.toLowerCase() === novoTecnico.username.toLowerCase())) {
      alert('Este nome de usuário já está em uso por outro técnico.');
      return;
    }
    const novo: Tecnico = {
      id: Date.now(),
      nome: formatarTitulo(novoTecnico.nome),
      especialidade: formatarTitulo(novoTecnico.especialidade || 'Geral'),
      username: novoTecnico.username.trim(),
      senha: novoTecnico.senha,
      cargo: novoTecnico.cargo
    };
    setTecnicos([...tecnicos, novo]);
    setNovoTecnico({ nome: '', especialidade: '', username: '', senha: '', cargo: 'Técnico / Atendente' });
  };

  const excluirTecnico = (id: number) => {
    if (tecnicos.length <= 1) {
      alert('A loja precisa ter pelo menos um técnico cadastrado.');
      return;
    }
    if (confirm('Deseja realmente remover este técnico e seu acesso ao sistema?')) {
      setTecnicos(tecnicos.filter(t => t.id !== id));
    }
  };

  const adicionarFornecedor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoFornecedor.nome) {
      alert('Preencha o Nome do Fornecedor.');
      return;
    }
    const novo: Fornecedor = {
      id: Date.now(),
      nome: formatarTitulo(novoFornecedor.nome),
      contato: novoFornecedor.contato,
      observacao: novoFornecedor.observacao
    };
    setFornecedores([...fornecedores, novo]);
    setNovoFornecedor({ nome: '', contato: '', observacao: '' });
    alert('Fornecedor cadastrado com sucesso!');
  };

  const excluirFornecedor = (id: number) => {
    if (confirm('Deseja realmente remover este fornecedor?')) {
      setFornecedores(fornecedores.filter(f => f.id !== id));
    }
  };

  const salvarPecaEstoque = (e: React.FormEvent) => {
    e.preventDefault();
    if (pecaEmEdicaoId !== null) {
      setEstoque(estoque.map(p => p.id === pecaEmEdicaoId ? { ...p, ...novaPeca, nome: formatarTitulo(novaPeca.nome) } : p));
      setPecaEmEdicaoId(null);
    } else {
      setEstoque([...estoque, { ...novaPeca, nome: formatarTitulo(novaPeca.nome), id: Date.now() }]);
    }
    setNovaPeca({ nome: '', categoria: 'Celular', quantidade: 1, minimo: 2, precoCusto: 0, precoVenda: 0 });
  };

  const carregarPecaParaEdicao = (p: PecaEstoque) => {
    setNovaPeca({
      nome: p.nome,
      categoria: p.categoria,
      quantidade: p.quantidade,
      minimo: p.minimo,
      precoCusto: p.precoCusto,
      precoVenda: p.precoVenda
    });
    setPecaEmEdicaoId(p.id);
  };

  const excluirPecaEstoque = (id: number) => {
    if (confirm('Deseja realmente remover esta peça do estoque?')) {
      setEstoque(estoque.filter(p => p.id !== id));
    }
  };

  const faturamentoTotal = ordens
    .filter(o => !o.deletada && (o.status === 'Pronto' || o.status === 'Entregue'))
    .reduce((acc, o) => acc + Number(o.valorPecas) + Number(o.valorMaoDeObra), 0);

  const resumoMensalMap: Record<string, { bruto: number, pecas: number, lucro: number, quantidade: number }> = {};
  
  ordens.filter(o => !o.deletada && (o.status === 'Pronto' || o.status === 'Entregue')).forEach(o => {
    const partes = o.dataEntrada.split('/');
    if (partes.length === 3) {
      const mesAno = `${partes[1]}/${partes[2]}`;
      if (!resumoMensalMap[mesAno]) {
        resumoMensalMap[mesAno] = { bruto: 0, pecas: 0, lucro: 0, quantidade: 0 };
      }
      const bruto = Number(o.valorPecas) + Number(o.valorMaoDeObra);
      const custoPecas = Number(o.valorPecas);
      const lucro = Number(o.valorMaoDeObra);
      
      resumoMensalMap[mesAno].bruto += bruto;
      resumoMensalMap[mesAno].pecas += custoPecas;
      resumoMensalMap[mesAno].lucro += lucro;
      resumoMensalMap[mesAno].quantidade += 1;
    }
  });

  const listaResumoMensal = Object.entries(resumoMensalMap).map(([mesAno, dados]) => ({
    mesAno,
    ...dados
  })).sort((a, b) => b.mesAno.localeCompare(a.mesAno));

  const marcasDisponiveis = BANCO_APARELHOS[novaOS.tipo]?.marcas || [];
  const modelosDisponiveis = BANCO_APARELHOS[novaOS.tipo]?.modelos[novaOS.marca] || [];

  const ordensFiltradasDashboard = ordens.filter(o => {
    if (o.deletada) return false;
    if (termoBuscaDash.trim().length < 4) return false;
    const termo = termoBuscaDash.trim().toLowerCase();
    
    const clienteStr = o.cliente.toLowerCase();
    const wppStr = o.whatsapp.replace(/\D/g, '');
    const cpfStr = o.cpf.replace(/\D/g, '');
    const termoLimpo = termo.replace(/\D/g, '');

    const matchNome = clienteStr.includes(termo);
    const matchWpp = wppStr.includes(termoLimpo) && termoLimpo.length >= 4;
    const matchCpf = cpfStr.includes(termoLimpo) && termoLimpo.length >= 4;

    return matchNome || matchWpp || matchCpf;
  });

  const pecasEncontradasNoEstoque = estoque.filter(p => {
    if (!termoBuscaPeca.trim()) return false;
    return p.nome.toLowerCase().includes(termoBuscaPeca.trim().toLowerCase());
  });

  if (!usuarioLogado) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${modoNoturno ? 'bg-slate-950 text-white' : 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600'}`}>
        <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white'} rounded-3xl max-w-md w-full p-8 shadow-2xl border`}>
          <div className="flex items-center justify-center mb-6">
            <img src={logoCustomizado} alt={nomeEmpresa} style={{ height: `${logoAltura}px` }} className="w-auto object-contain rounded-2xl drop-shadow-md" onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
          </div>
          <h2 className={`text-xl font-black text-center mb-2 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>{nomeEmpresa}</h2>
          <p className="text-xs text-center text-slate-400 mb-2 font-medium">Sistema de Gestão de Assistência Técnica</p>
          <p className="text-[10px] text-center text-blue-500 font-mono mb-8">v1.0.0</p>

          <form onSubmit={(e) => {
            e.preventDefault();
            const encontrado = tecnicos.find(t => t.username && t.username.toLowerCase() === inputUser.trim().toLowerCase() && t.senha === inputPass);
            if (encontrado) {
              setUsuarioLogado(encontrado);
              setInputUser('');
              setInputPass('');
              setNovaOS(prev => ({ ...prev, tecnicoId: encontrado.id }));
            } else {
              alert('Usuário ou senha incorretos! (Padrão: admin / 123)');
            }
          }} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Usuário</label>
              <input
                type="text"
                autoFocus
                required
                value={inputUser}
                onChange={e => setInputUser(e.target.value)}
                className={`w-full border rounded-2xl p-4 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} focus:ring-4 focus:ring-blue-500/20`}
                placeholder="Ex: admin"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Senha</label>
              <input
                type="password"
                required
                value={inputPass}
                onChange={e => setInputPass(e.target.value)}
                className={`w-full border rounded-2xl p-4 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} focus:ring-4 focus:ring-blue-500/20`}
                placeholder="••••"
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold py-4 rounded-2xl shadow-xl shadow-blue-500/30 transition">
              Entrar no Sistema
            </button>
          </form>
          <p className="text-[11px] text-slate-400 text-center mt-6">Usuário inicial: <strong>admin</strong> | Senha: <strong>123</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col md:flex-row transition-colors duration-300 ${modoNoturno ? 'bg-slate-950 text-slate-100' : 'bg-[#F4F7FE] text-slate-800'}`} onMouseUp={finalizarDesenho} onTouchEnd={finalizarDesenho}>
      
      {popupProntosAberto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'} rounded-3xl max-w-md w-full p-6 shadow-2xl border text-center`}>
            <div className="bg-emerald-500/20 text-emerald-500 p-3.5 rounded-2xl w-14 h-14 mx-auto mb-4 flex items-center justify-center">
              <Bell size={28} className="animate-bounce" />
            </div>
            <h3 className="font-black text-xl mb-2">Aparelhos Prontos!</h3>
            <p className="text-xs text-slate-400 mb-6 font-medium">Existem aparelhos com status <strong className="text-emerald-500">"Pronto"</strong> aguardando para ligar / contactar o cliente na Área Financeira.</p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setPopupProntosAberto(false);
                  setAbaAtiva('financeiro');
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-emerald-500/30 transition uppercase tracking-wider text-xs"
              >
                📞 Ir para Aba Ligar / Financeiro
              </button>
              <button
                onClick={() => setPopupProntosAberto(false)}
                className="w-full bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 font-bold py-3 rounded-2xl text-xs transition"
              >
                Fechar Aviso
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className={`w-full md:w-64 border-r p-5 flex flex-col gap-2 print:hidden shadow-sm transition-colors duration-300 ${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <div className="flex flex-col items-center mb-6 pb-4 border-b border-inherit text-center">
          <img src={logoCustomizado} alt={nomeEmpresa} style={{ height: `${Math.round(logoAltura * 0.8)}px` }} className="w-auto object-contain rounded-2xl mb-2 shadow-sm" onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
          <h1 className={`font-black text-sm tracking-tight ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>{nomeEmpresa}</h1>
          <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Sistema de Gestão</span>
        </div>

        <button onClick={() => setAbaAtiva('dashboard')} className={`flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition ${abaAtiva === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : `${modoNoturno ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-50 text-slate-600'}`}`}>
          <LayoutDashboard size={20} /> Dashboard
        </button>
        <button onClick={() => { setOsEmEdicaoId(null); setAbaAtiva('nova-os'); }} className={`flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition ${abaAtiva === 'nova-os' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : `${modoNoturno ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-50 text-slate-600'}`}`}>
          <PlusCircle size={20} /> Nova OS
        </button>
        <button onClick={() => setAbaAtiva('ordens')} className={`flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition ${abaAtiva === 'ordens' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : `${modoNoturno ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-50 text-slate-600'}`}`}>
          <ClipboardList size={20} /> Ordens de Serviço
        </button>
        
        <button onClick={() => solicitarAdmin(() => setAbaAtiva('estoque'))} className={`flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition ${abaAtiva === 'estoque' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : `${modoNoturno ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-50 text-slate-600'}`}`}>
          <Package size={20} /> Estoque (Admin)
        </button>
        
        {usuarioLogado?.cargo === 'Administrador' && (
          <>
            <button onClick={() => setAbaAtiva('financeiro')} className={`flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition ${abaAtiva === 'financeiro' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : `${modoNoturno ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-50 text-slate-600'}`}`}>
              <DollarSign size={20} /> Área Financeira (Admin)
            </button>
            <button onClick={() => setAbaAtiva('configuracoes')} className={`flex items-center gap-3 p-3.5 rounded-2xl text-sm font-bold transition ${abaAtiva === 'configuracoes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : `${modoNoturno ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-50 text-slate-600'}`}`}>
              <Settings size={20} /> Configurações & Acessos (Admin)
            </button>
          </>
        )}

        <button
          onClick={() => setModoNoturno(!modoNoturno)}
          className={`flex items-center justify-between p-3.5 rounded-2xl text-sm font-bold transition mt-2 border ${modoNoturno ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-50 border-slate-200 text-indigo-600'}`}
        >
          <span className="flex items-center gap-2">
            {modoNoturno ? <Sun size={18} /> : <Moon size={18} />}
            {modoNoturno ? 'Modo Diurno' : 'Modo Noturno'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold">Auto</span>
        </button>

        <div className="mt-auto pt-4 border-t border-inherit flex items-center justify-between text-xs font-bold text-slate-400">
          <button onClick={() => setUsuarioLogado(null)} className="flex items-center gap-1.5 text-red-500 hover:underline">
            <LogOut size={14} /> Sair ({usuarioLogado.username})
          </button>
          <div className="flex flex-col items-end">
            <span>{usuarioLogado.cargo === 'Administrador' ? '🛡️ Admin' : '👨‍🔧 Técnico'}</span>
            <span className="text-[9px] text-blue-500 font-mono">v1.0.0</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto print:hidden">
        {abaAtiva === 'dashboard' && (
          <div>
            <h2 className={`text-2xl font-black mb-6 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>Visão Geral da Assistência</h2>
            
            <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border mb-8`}>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Search size={16} className="text-blue-500" /> Pesquisar
              </label>
              <input
                type="text"
                value={termoBuscaDash}
                onChange={e => setTermoBuscaDash(e.target.value)}
                placeholder="Pesquisar..."
                className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} focus:ring-2 focus:ring-blue-500`}
              />
            </div>

            {termoBuscaDash.trim().length >= 4 ? (
              <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border mb-8`}>
                <h3 className={`font-extrabold text-lg mb-4 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>
                  Resultados da Pesquisa ({ordensFiltradasDashboard.length})
                </h3>
                {ordensFiltradasDashboard.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhuma OS encontrada correspondendo ao termo inserido.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-inherit text-slate-400 text-xs font-black uppercase tracking-wider">
                          <th className="py-3">OS</th>
                          <th>Cliente</th>
                          <th>WhatsApp / CPF</th>
                          <th>Aparelho</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ordensFiltradasDashboard.map(os => (
                          <tr key={os.id} className="border-b border-inherit last:border-0 text-sm">
                            <td className="py-4 font-black text-blue-500">
                              #{os.id} {os.garantia && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold ml-1">GARANTIA</span>}
                            </td>
                            <td className={`font-bold ${os.lojista ? 'text-red-600 font-black' : (modoNoturno ? 'text-white' : 'text-slate-800')}`}>{os.cliente} {os.lojista && <span className="text-[10px] bg-red-500/20 text-red-600 px-2 py-0.5 rounded-full font-black ml-1">LOJISTA</span>}</td>
                            <td className="text-slate-400 text-xs font-medium">{os.whatsapp} <br/>{os.cpf || 'Sem CPF'}</td>
                            <td className="text-slate-400 font-medium">{os.marca} {os.modelo}</td>
                            <td><span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400">{os.status}</span></td>
                            <td className="space-x-2">
                              <button onClick={() => { setOsParaImprimir(os); setFormatoImpressao('A4'); }} className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition">
                                Ver / Imprimir
                              </button>
                              <button onClick={() => iniciarNovaOSComCliente(os)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition">
                                + Nova OS
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
                  <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border flex flex-col justify-between`}>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Total de OS</span>
                    <p className={`text-4xl font-black mt-3 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>{ordens.filter(o => !o.deletada).length}</p>
                  </div>
                  <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border flex flex-col justify-between`}>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-500">Em Bancada / Análise</span>
                    <p className={`text-4xl font-black mt-3 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>
                      {ordens.filter(o => !o.deletada && o.status !== 'Pronto' && o.status !== 'Entregue').length}
                    </p>
                  </div>
                  <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border flex flex-col justify-between`}>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-500">Prontas para Retirada</span>
                    <p className={`text-4xl font-black mt-3 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>
                      {ordens.filter(o => !o.deletada && o.status === 'Pronto').length}
                    </p>
                  </div>
                  
                  {usuarioLogado?.cargo === 'Administrador' && (
                    <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border flex flex-col justify-between`}>
                      <span className="text-xs font-black uppercase tracking-wider text-blue-500">Receita (Prontas/Entregues)</span>
                      <p className={`text-4xl font-black mt-3 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>R$ {faturamentoTotal.toFixed(2)}</p>
                    </div>
                  )}
                </div>

                <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border`}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className={`font-extrabold text-lg ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>Últimas Ordens de Serviço</h3>
                    <button onClick={() => { setOsEmEdicaoId(null); setAbaAtiva('nova-os'); }} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-2xl text-xs font-bold tracking-wide uppercase transition shadow-lg shadow-blue-500/30">
                      + Abrir Nova OS
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-inherit text-slate-400 text-xs font-black uppercase tracking-wider">
                          <th className="py-3">OS</th>
                          <th>Cliente</th>
                          <th>Aparelho</th>
                          <th>Técnico</th>
                          <th>Status</th>
                          {usuarioLogado?.cargo === 'Administrador' && <th>Total</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {ordens
                          .filter(o => !o.deletada && o.status !== 'Pronto' && o.status !== 'Entregue')
                          .slice(0, 4)
                          .map(os => (
                            <tr key={os.id} className="border-b border-inherit last:border-0 text-sm">
                              <td className="py-4 font-black text-blue-500">
                                #{os.id} {os.garantia && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold ml-1">GARANTIA</span>}
                              </td>
                              <td className={`font-bold ${os.lojista ? 'text-red-600 font-black' : (modoNoturno ? 'text-white' : 'text-slate-800')}`}>{os.cliente} {os.lojista && <span className="text-[10px] bg-red-500/20 text-red-600 px-2 py-0.5 rounded-full font-black ml-1">LOJISTA</span>}</td>
                              <td className="text-slate-400 font-medium">{os.marca} {os.modelo}</td>
                              <td><span className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full font-bold">{os.tecnicoNome}</span></td>
                              <td><span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-400">{os.status}</span></td>
                              {usuarioLogado?.cargo === 'Administrador' && (
                                <td className={`font-black ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>R$ {(Number(os.valorPecas) + Number(os.valorMaoDeObra)).toFixed(2)}</td>
                              )}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {abaAtiva === 'configuracoes' && usuarioLogado?.cargo === 'Administrador' && (
          <div className="space-y-8 max-w-4xl">
            <h2 className={`text-2xl font-black ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>Configurações e Gestão de Acessos (v1.0.0)</h2>
            
            <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border space-y-4`}>
              <h3 className={`font-black text-lg ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>Nome da Empresa / Assistência</h3>
              <p className="text-xs text-slate-400">Defina o nome que aparecerá no topo do sistema, menus e em todos os PDFs gerados.</p>
              <div className="max-w-md">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Nome da Loja</label>
                <input 
                  type="text" 
                  value={nomeEmpresa} 
                  onChange={e => setNomeEmpresa(e.target.value)} 
                  className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  placeholder="Ex: TECH ASSISTENCIA"
                />
              </div>
            </div>

            <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border space-y-4`}>
              <h3 className={`font-black text-lg ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>Gerenciamento de Dados (Backup & Reset)</h3>
              <p className="text-xs text-slate-400">Faça o backup de segurança dos dados do sistema ou suba um arquivo de backup para restaurar os dados. Ao clicar em Reset, o backup é baixado automaticamente antes de zerar o sistema por completo.</p>
              
              <div className="flex flex-wrap gap-4 pt-2">
                <button
                  type="button"
                  onClick={criarBackupSistema}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wide shadow-md transition"
                >
                  <Download size={16} /> Criar Backup do Sistema (Download)
                </button>

                <label className="cursor-pointer inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wide shadow-md transition">
                  <Upload size={16} /> Subir Backup do Sistema (.json)
                  <input type="file" accept=".json" onChange={restaurarBackupSistema} className="hidden" />
                </label>

                <button
                  type="button"
                  onClick={resetarSistema}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wide shadow-md transition"
                >
                  <AlertTriangle size={16} /> Reset do Sistema (c/ Backup Automático)
                </button>
              </div>
            </div>

            <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border space-y-4`}>
              <h3 className={`font-black text-lg ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>Numeração Inicial de Ordens de Serviço</h3>
              <p className="text-xs text-slate-400">Defina o número inicial para a próxima OS gerada.</p>
              <div className="max-w-xs">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Próximo Número de OS</label>
                <input 
                  type="number" 
                  value={numeroInicialOS} 
                  onChange={e => setNumeroInicialOS(Number(e.target.value))} 
                  className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                />
              </div>
            </div>

            <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border space-y-5`}>
              <h3 className={`font-black text-lg ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>Gerenciamento do Logo</h3>
              
              <div className="flex flex-wrap gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wide shadow-md transition">
                  <Upload size={16} /> Trocar Imagem do Logo
                  <input type="file" accept="image/*" onChange={importarLogoSistema} className="hidden" />
                </label>

                <button
                  type="button"
                  onClick={restaurarLogoPadrao}
                  className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-3 rounded-2xl text-xs font-bold uppercase tracking-wide shadow-md transition"
                >
                  <RotateCcw size={16} /> Restaurar Logo Padrão
                </button>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                  Ajustar Altura do Logo (Pixels): {logoAltura}px
                </label>
                <input 
                  type="range" 
                  min="40" 
                  max="150" 
                  value={logoAltura} 
                  onChange={e => setLogoAltura(Number(e.target.value))} 
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-center p-6 border rounded-2xl bg-slate-950">
                <img src={logoCustomizado} alt="Preview Logo" style={{ height: `${logoAltura}px` }} className="object-contain rounded-2xl drop-shadow" onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form onSubmit={adicionarFornecedor} className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border space-y-4 h-fit`}>
                <h3 className={`font-black text-lg flex items-center gap-2 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>
                  <Truck className="text-blue-500" size={20} /> Cadastrar Fornecedor
                </h3>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Nome do Fornecedor *</label>
                  <input required value={novoFornecedor.nome} onChange={e => setNovoFornecedor({ ...novoFornecedor, nome: e.target.value })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} placeholder="Ex: Distribuidora X" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Contato / Telefone</label>
                  <input value={novoFornecedor.contato} onChange={e => setNovoFornecedor({ ...novoFornecedor, contato: e.target.value })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} placeholder="Ex: (11) 99999-9999" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Observações</label>
                  <input value={novoFornecedor.observacao} onChange={e => setNovoFornecedor({ ...novoFornecedor, observacao: e.target.value })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} placeholder="Ex: Peças para linha Apple" />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-blue-500/30 transition uppercase tracking-wider text-xs">
                  Cadastrar Fornecedor
                </button>
              </form>

              <div className={`lg:col-span-2 ${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border`}>
                <h3 className={`font-black text-lg mb-4 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>Fornecedores Cadastrados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fornecedores.map(f => (
                    <div key={f.id} className={`border p-5 rounded-2xl flex items-center justify-between ${modoNoturno ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50 border-slate-200'}`}>
                      <div>
                        <h4 className={`font-black text-base ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>{f.nome}</h4>
                        <p className="text-xs text-slate-400 font-medium mt-1">Tel: {f.contato || 'Não informado'} • {f.observacao || 'Sem obs'}</p>
                      </div>
                      <button onClick={() => excluirFornecedor(f.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition" title="Excluir Fornecedor">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <form onSubmit={adicionarTecnico} className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border space-y-4 h-fit`}>
                <h3 className={`font-black text-lg ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>Cadastrar Técnico e Acesso</h3>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Nome Completo *</label>
                  <input required value={novoTecnico.nome} onChange={e => setNovoTecnico({ ...novoTecnico, nome: e.target.value })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} placeholder="Ex: Roberto Carlos" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Especialidade / Setor</label>
                  <input value={novoTecnico.especialidade} onChange={e => setNovoTecnico({ ...novoTecnico, especialidade: e.target.value })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} placeholder="Ex: Microeletrônica / Software" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Usuário de Login *</label>
                  <input required value={novoTecnico.username} onChange={e => setNovoTecnico({ ...novoTecnico, username: e.target.value })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} placeholder="Ex: roberto" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Senha de Acesso *</label>
                  <input type="password" required value={novoTecnico.senha} onChange={e => setNovoTecnico({ ...novoTecnico, senha: e.target.value })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} placeholder="••••" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Nível de Permissão</label>
                  <select value={novoTecnico.cargo} onChange={e => setNovoTecnico({ ...novoTecnico, cargo: e.target.value as any })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
                    <option value="Técnico / Atendente">Técnico / Atendente</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-blue-500/30 transition uppercase tracking-wider text-xs">
                  Cadastrar Técnico e Acesso
                </button>
              </form>

              <div className={`lg:col-span-2 ${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border`}>
                <h3 className={`font-black text-lg mb-4 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>Técnicos Registrados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tecnicos.map(t => (
                    <div key={t.id} className={`border p-5 rounded-2xl flex items-center justify-between ${modoNoturno ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50 border-slate-200'}`}>
                      <div>
                        <span className={`text-xs px-3 py-1 rounded-full font-black ${t.cargo === 'Administrador' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                          {t.cargo || 'Técnico'}
                        </span>
                        <h4 className={`font-black text-base mt-2 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>{t.nome}</h4>
                        <p className="text-xs text-slate-400 font-medium">{t.especialidade} • <span className="text-blue-400 font-mono">@{t.username}</span></p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">👨‍🔧</span>
                        <button onClick={() => excluirTecnico(t.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition" title="Excluir Técnico">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'financeiro' && usuarioLogado?.cargo === 'Administrador' && (
          <div className="space-y-8">
            <h2 className={`text-2xl font-black ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>Área Financeira e Pagamentos</h2>

            <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border`}>
              <h3 className={`font-black text-lg mb-4 flex items-center gap-2 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>
                📞 Ligar (Aparelhos Prontos para Retirada)
              </h3>
              {ordens.filter(o => !o.deletada && o.status === 'Pronto').length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Nenhum aparelho com status "Pronto" no momento.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-inherit text-slate-400 text-xs font-black uppercase tracking-wider">
                        <th className="py-3">OS</th>
                        <th>Cliente</th>
                        <th>WhatsApp / Contato</th>
                        <th>Aparelho</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordens.filter(o => !o.deletada && o.status === 'Pronto').map(os => {
                        const foneLimpo = os.whatsapp.replace(/\D/g, '');
                        const foneComDDI = foneLimpo.startsWith('55') ? foneLimpo : `55${foneLimpo}`;
                        const mensagem = `Olá *${os.cliente}*! Aqui é da ${nomeEmpresa}. Seu aparelho (${os.marca} ${os.modelo}) já está pronto para retirada!`;

                        return (
                          <tr key={os.id} className="border-b border-inherit last:border-0 text-sm">
                            <td className="py-4 font-black text-blue-500">#{os.id}</td>
                            <td className={`font-bold ${os.lojista ? 'text-red-600 font-black' : (modoNoturno ? 'text-white' : 'text-slate-800')}`}>{os.cliente}</td>
                            <td className="text-slate-400 text-xs font-medium">{os.whatsapp}</td>
                            <td className="text-slate-400 font-medium">{os.marca} {os.modelo}</td>
                            <td>
                              <a
                                href={`https://wa.me/${foneComDDI}?text=${encodeURIComponent(mensagem)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
                              >
                                <MessageCircle size={14} /> Chamar no WhatsApp
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border space-y-4 h-fit`}>
                <h3 className={`font-black text-lg flex items-center gap-2 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>
                  <QrCode className="text-blue-500" size={22} /> Configuração de Pix e QR Code
                </h3>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Tipo de Chave</label>
                  <select 
                    value={configPix.tipoChave} 
                    onChange={e => {
                      const novoTipo = e.target.value;
                      setConfigPix(prev => ({ ...prev, tipoChave: novoTipo, chave: '' }));
                    }} 
                    className={`w-full border rounded-2xl p-3 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="Telefone">Telefone</option>
                    <option value="E-mail">E-mail</option>
                    <option value="Aleatória">Chave Aleatória</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Chave Pix *</label>
                  <input 
                    value={configPix.chave} 
                    onChange={e => {
                      const valFormatado = formatarChavePix(configPix.tipoChave, e.target.value);
                      setConfigPix({ ...configPix, chave: valFormatado });
                    }} 
                    className={`w-full border rounded-2xl p-3 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} 
                    placeholder="Digite a chave..." 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Nome do Beneficiário / Favorecido *</label>
                  <input value={configPix.favorecido} onChange={e => setConfigPix({ ...configPix, favorecido: e.target.value })} className={`w-full border rounded-2xl p-3 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} placeholder="Ex: Tech Assistencia" />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Importar Imagem do QR Code</label>
                  <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wide shadow-md transition">
                    <Upload size={14} /> Selecionar QR Code
                    <input type="file" accept="image/*" onChange={importarQrCodePix} className="hidden" />
                  </label>
                </div>

                {configPix.qrCodeUrl && (
                  <div className="flex flex-col items-center justify-center p-3 border rounded-2xl bg-white">
                    <img src={configPix.qrCodeUrl} alt="Pré-visualização QR Code Pix" className="h-32 w-32 object-contain" />
                    <span className="text-[10px] text-slate-500 mt-1">Pré-visualização do QR Code</span>
                  </div>
                )}
              </div>

              <div className={`lg:col-span-2 ${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border`}>
                <h3 className={`font-black text-lg mb-4 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>Resumos Mensais (Entrada Bruta e Lucros)</h3>
                
                {listaResumoMensal.length === 0 ? (
                  <p className="text-sm text-slate-400 py-10 text-center">Nenhum serviço finalizado (Pronto ou Entregue) registrado ainda.</p>
                ) : (
                  <div className="space-y-4">
                    {listaResumoMensal.map((item, idx) => (
                      <div key={idx} className={`border p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${modoNoturno ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                        <div>
                          <span className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full font-black">Mês: {item.mesAno}</span>
                          <h4 className={`font-black text-base mt-2 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>{item.quantidade} Aparelho(s) Concluído(s)</h4>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-right">
                          <div className="bg-slate-500/10 px-4 py-2 rounded-2xl">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Entrada Bruta</span>
                            <span className={`font-black text-base ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>R$ {item.bruto.toFixed(2)}</span>
                          </div>
                          <div className="bg-amber-500/10 px-4 py-2 rounded-2xl">
                            <span className="text-[10px] uppercase font-bold text-amber-500 block">Custo Peças</span>
                            <span className="font-black text-base text-amber-500">R$ {item.pecas.toFixed(2)}</span>
                          </div>
                          <div className="bg-emerald-500/10 px-4 py-2 rounded-2xl">
                            <span className="text-[10px] uppercase font-bold text-emerald-500 block">Lucro Líquido</span>
                            <span className="font-black text-base text-emerald-500">R$ {item.lucro.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'nova-os' && (
          <form onSubmit={salvarNovaOS} className={`max-w-4xl ${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-8 rounded-3xl shadow-sm border`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-black ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>
                {osEmEdicaoId !== null ? `Editando OS #${osEmEdicaoId}` : 'Abertura de Ordem de Serviço'}
              </h2>
              {osEmEdicaoId !== null && (
                <button type="button" onClick={() => { setOsEmEdicaoId(null); setAbaAtiva('ordens'); }} className="text-xs font-bold text-red-500 hover:underline">
                  Cancelar Edição
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Nome do Cliente *</label>
                <input required value={novaOS.cliente} onChange={e => setNovaOS({ ...novaOS, cliente: e.target.value.toUpperCase() })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold uppercase transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} focus:ring-2 focus:ring-blue-500 ${novaOS.lojista ? 'text-red-600 font-black border-red-500' : ''}`} placeholder="EX: JOÃO SILVA" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">WhatsApp (11 dígitos c/ DDD) *</label>
                <input required maxLength={11} value={novaOS.whatsapp} onChange={e => setNovaOS({ ...novaOS, whatsapp: e.target.value.replace(/\D/g, '').slice(0, 11) })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} focus:ring-2 focus:ring-blue-500`} placeholder="Ex: 11988887777" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">CPF / CNPJ (Verificação Automática)</label>
                <input value={novaOS.cpf} onChange={e => setNovaOS({ ...novaOS, cpf: e.target.value })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} focus:ring-2 focus:ring-blue-500`} placeholder="000.000.000-00" />
              </div>
            </div>

            <div className="mb-6">
              <label className="inline-flex items-center gap-3 p-4 rounded-2xl border cursor-pointer bg-red-500/10 border-red-500/30 transition hover:bg-red-500/20">
                <input
                  type="checkbox"
                  checked={novaOS.lojista || false}
                  onChange={e => setNovaOS({ ...novaOS, lojista: e.target.checked })}
                  className="w-5 h-5 rounded text-red-600 focus:ring-red-500 accent-red-600"
                />
                <span className="text-sm font-black text-red-500 uppercase tracking-wider">Lojista</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Tipo de Aparelho</label>
                <select
                  value={novaOS.tipo}
                  onChange={e => {
                    const novoTipo = e.target.value as 'Celular' | 'Tablet' | 'Notebook';
                    const primeiraMarca = BANCO_APARELHOS[novoTipo].marcas[0];
                    setNovaOS({ ...novaOS, tipo: novoTipo, marca: primeiraMarca, modelo: '' });
                  }}
                  className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="Celular">Celular</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Notebook">Notebook</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Marca *</label>
                <select
                  required
                  value={novaOS.marca}
                  onChange={e => setNovaOS({ ...novaOS, marca: e.target.value, modelo: '' })}
                  className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} focus:ring-2 focus:ring-blue-500`}
                >
                  {marcasDisponiveis.map((m, idx) => (
                    <option key={idx} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Modelo *</label>
                <input
                  required
                  list="lista-modelos"
                  value={novaOS.modelo}
                  onChange={e => setNovaOS({ ...novaOS, modelo: e.target.value })}
                  className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} focus:ring-2 focus:ring-blue-500`}
                  placeholder="Selecione ou digite o modelo..."
                />
                <datalist id="lista-modelos">
                  {modelosDisponiveis.map((mod, idx) => (
                    <option key={idx} value={mod} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">IMEI ou Nº de Série</label>
                <input value={novaOS.imeiSerial} onChange={e => setNovaOS({ ...novaOS, imeiSerial: e.target.value })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} focus:ring-2 focus:ring-blue-500`} placeholder="Opcional" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Acessórios Deixados</label>
                <input value={novaOS.acessorios} onChange={e => setNovaOS({ ...novaOS, acessorios: e.target.value })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} focus:ring-2 focus:ring-blue-500`} placeholder="Carregador, capa, bolsa..." />
              </div>
            </div>

            <div className={`mb-6 p-5 rounded-3xl border ${modoNoturno ? 'bg-purple-950/20 border-purple-900/50' : 'bg-purple-50/50 border-purple-100'}`}>
              <label className="block text-xs font-black text-purple-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Truck size={16} /> Fornecedor da Peça / Aparelho (Confidencial — Visível Apenas no Sistema)
              </label>
              <select
                value={novaOS.fornecedorId}
                onChange={e => setNovaOS({ ...novaOS, fornecedorId: e.target.value })}
                className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-purple-200 text-slate-800'} focus:ring-2 focus:ring-purple-500`}
              >
                <option value="">Selecione um fornecedor (opcional)...</option>
                {fornecedores.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nome} {f.observacao ? `(${f.observacao})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className={`mb-6 p-5 rounded-3xl border ${modoNoturno ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <label className="block text-xs font-black text-emerald-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Search size={16} /> Pesquisar Peça no Estoque para Orçamento
              </label>
              <input
                type="text"
                value={termoBuscaPeca}
                onChange={e => setTermoBuscaPeca(e.target.value)}
                placeholder="Digite o nome da peça no estoque para adicionar..."
                className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'} focus:ring-2 focus:ring-emerald-500`}
              />
              {termoBuscaPeca.trim() !== '' && (
                <div className={`mt-3 border rounded-2xl p-3 max-h-40 overflow-y-auto ${modoNoturno ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                  {pecasEncontradasNoEstoque.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-2">Nenhuma peça encontrada no estoque.</p>
                  ) : (
                    pecasEncontradasNoEstoque.map(peca => (
                      <div
                        key={peca.id}
                        onClick={() => {
                          const textoAtualLaudo = novaOS.laudo ? novaOS.laudo + '\n' : '';
                          setNovaOS(prev => ({
                            ...prev,
                            laudo: `${textoAtualLaudo}Peça aplicada: ${peca.nome} (R$ ${peca.precoVenda.toFixed(2)})`,
                            valorPecas: prev.valorPecas + peca.precoVenda
                          }));
                          setTermoBuscaPeca('');
                          alert(`Peça "${peca.nome}" adicionada ao orçamento (R$ ${peca.precoVenda.toFixed(2)})!`);
                        }}
                        className={`flex justify-between items-center p-2.5 rounded-xl cursor-pointer text-xs font-bold transition ${modoNoturno ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'}`}
                      >
                        <span>📦 {peca.nome} <span className="text-slate-400 font-normal">({peca.quantidade} em estoque)</span></span>
                        <span className="text-emerald-500 font-black">R$ {peca.precoVenda.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className={`mb-6 p-5 rounded-3xl border ${modoNoturno ? 'bg-blue-950/20 border-blue-900/50' : 'bg-blue-50/50 border-blue-100'}`}>
              <label className="block text-xs font-black text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <UserCheck size={16} /> Técnico Responsável pelo Atendimento *
              </label>
              <select
                required
                value={novaOS.tecnicoId}
                onChange={e => setNovaOS({ ...novaOS, tecnicoId: Number(e.target.value) })}
                className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-blue-200 text-slate-800'} focus:ring-2 focus:ring-blue-500`}
              >
                {tecnicos.map(t => (
                  <option key={t.id} value={t.id}>
                    [ID #{t.id}] {t.nome} — {t.especialidade}
                  </option>
                ))}
              </select>
            </div>

            <div className={`mb-6 p-5 rounded-3xl border ${modoNoturno ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Lock size={16} className="text-blue-500" /> Senha ou Padrão de Desbloqueio
                </label>
                <div className={`flex gap-2 p-1 rounded-2xl border ${modoNoturno ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => { setNovaOS(prev => ({ ...prev, tipoSenha: 'pin', senha: '' })); setPadraoSelecionado([]); }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${novaOS.tipoSenha === 'pin' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'text-slate-400'}`}
                  >
                    <Hash size={14} /> Senha PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNovaOS(prev => ({ ...prev, tipoSenha: 'padrao', senha: '' })); }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${novaOS.tipoSenha === 'padrao' ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'text-slate-400'}`}
                  >
                    <Grid size={14} /> Padrão (Desenho)
                  </button>
                </div>
              </div>

              {novaOS.tipoSenha === 'pin' ? (
                <div>
                  <input
                    value={novaOS.senha}
                    onChange={e => setNovaOS({ ...novaOS, senha: e.target.value })}
                    className={`w-full border rounded-2xl p-3.5 font-mono text-sm font-bold transition ${modoNoturno ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                    placeholder="Digite a senha numérica ou PIN..."
                  />
                </div>
              ) : (
                <div className={`flex flex-col items-center justify-center p-5 rounded-2xl border ${modoNoturno ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between w-full max-w-xs mb-3 items-center">
                    <span className="text-xs text-slate-400 font-bold">
                      {padraoSelecionado.length === 0 ? 'Clique e arraste nas bolinhas (1 a 9):' : `Sequência: ${padraoSelecionado.join(' → ')}`}
                    </span>
                    <button type="button" onClick={limparPadrao} className="text-xs font-bold text-red-500 hover:underline">
                      Limpar Desenho
                    </button>
                  </div>

                  <div ref={gridPadraoRef} className="relative p-6 bg-slate-950 rounded-3xl select-none shadow-inner border border-slate-800">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                      {padraoSelecionado.length > 1 && padraoSelecionado.map((pId, idx) => {
                        if (idx === 0) return null;
                        const pAnterior = padraoSelecionado[idx - 1];
                        const el1 = gridPadraoRef.current?.querySelector(`[data-ponto="${pAnterior}"]`);
                        const el2 = gridPadraoRef.current?.querySelector(`[data-ponto="${pId}"]`);
                        if (!el1 || !el2) return null;
                        const rectGrid = gridPadraoRef.current!.getBoundingClientRect();
                        const r1 = el1.getBoundingClientRect();
                        const r2 = el2.getBoundingClientRect();
                        const x1 = r1.left + r1.width / 2 - rectGrid.left;
                        const y1 = r1.top + r1.height / 2 - rectGrid.top;
                        const x2 = r2.left + r2.width / 2 - rectGrid.left;
                        const y2 = r2.top + r2.height / 2 - rectGrid.top;
                        return <line key={idx} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />;
                      })}
                    </svg>

                    <div className="grid grid-cols-3 gap-6 relative z-10">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => {
                        const indexNaSelecao = padraoSelecionado.indexOf(id);
                        const selecionado = indexNaSelecao !== -1;
                        const ehPrimeiro = indexNaSelecao === 0;
                        const ehUltimo = indexNaSelecao === padraoSelecionado.length - 1 && padraoSelecionado.length > 1;

                        let corBolinha = 'bg-slate-800 hover:bg-slate-700 text-slate-400';
                        if (ehPrimeiro) {
                          corBolinha = 'bg-emerald-600 ring-4 ring-emerald-400/40 text-white scale-110 shadow-lg shadow-emerald-500/50';
                        } else if (ehUltimo) {
                          corBolinha = 'bg-red-600 ring-4 ring-red-400/40 text-white scale-110 shadow-lg shadow-red-500/50';
                        } else if (selecionado) {
                          corBolinha = 'bg-blue-600 ring-4 ring-blue-400/30 text-white scale-110 shadow-lg shadow-blue-500/50';
                        }

                        return (
                          <div
                            key={id}
                            onMouseDown={() => iniciarDesenho(id)}
                            onMouseEnter={() => lidarComToquePonto(id)}
                            onTouchStart={() => iniciarDesenho(id)}
                            onTouchMove={(e) => {
                              const touch = e.touches[0];
                              const target = document.elementFromPoint(touch.clientX, touch.clientY);
                              const pontoEl = target?.getAttribute('data-ponto');
                              if (pontoEl) lidarComToquePonto(Number(pontoEl));
                            }}
                            data-ponto={id}
                            className={`w-9 h-9 rounded-full cursor-pointer flex items-center justify-center transition-all ${corBolinha}`}
                          >
                            <span className="text-[10px] font-bold pointer-events-none" data-ponto={id}>{id}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckSquare size={16} className="text-blue-500" /> Checklist de Entrada
              </label>
              <div className={`grid grid-cols-2 md:grid-cols-4 gap-2 p-4 rounded-3xl border ${modoNoturno ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                {ITENS_CHECKLIST.map(item => (
                  <label key={item} className="flex items-center gap-2 text-xs font-bold text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={novaOS.checklist[item] || false}
                      onChange={e => setNovaOS({
                        ...novaOS,
                        checklist: { ...novaOS.checklist, [item]: e.target.checked }
                      })}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Camera size={16} className="text-blue-500" /> Fotos de Entrada (Avarias)
              </label>
              <div className={`p-4 rounded-3xl border border-dashed ${modoNoturno ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-300'}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setDestinoCamera({ origem: 'nova-os', etapa: 'entrada' })}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wide shadow-md transition"
                  >
                    📷 Abrir Câmera
                  </button>
                  <label className={`cursor-pointer px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wide border transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                    📁 Enviar Arquivo
                    <input type="file" accept="image/*" multiple onChange={adicionarFotosNovaOS} className="hidden" />
                  </label>
                </div>

                {novaOS.fotosEntrada.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-4">
                    {novaOS.fotosEntrada.map((foto, index) => (
                      <div key={index} className="relative group border rounded-2xl overflow-hidden bg-black shadow-sm">
                        <img src={foto} alt="Entrada" onClick={() => setFotoAmpliada(foto)} className="w-full h-24 object-cover cursor-pointer hover:opacity-90" />
                        <button type="button" onClick={() => setNovaOS(p => ({ ...p, fotosEntrada: p.fotosEntrada.filter((_, i) => i !== index) }))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1.5 shadow">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Defeito Reclamado *</label>
                <textarea required rows={3} value={novaOS.defeito} onChange={e => setNovaOS({ ...novaOS, defeito: e.target.value })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} placeholder="O que o cliente relatou..." />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Laudo Técnico / Observações</label>
                <textarea rows={3} value={novaOS.laudo} onChange={e => setNovaOS({ ...novaOS, laudo: e.target.value })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} placeholder="Diagnóstico da bancada..." />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Valor das Peças</label>
                <input 
                  type="text" 
                  value={novaOS.valorPecas ? formatarMoedaInput(novaOS.valorPecas) : ''} 
                  onChange={e => setNovaOS({ ...novaOS, valorPecas: converterMoedaParaNumero(e.target.value) })} 
                  className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} 
                  placeholder="R$ 0,00"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Valor da Mão de Obra</label>
                <input 
                  type="text" 
                  value={novaOS.valorMaoDeObra ? formatarMoedaInput(novaOS.valorMaoDeObra) : ''} 
                  onChange={e => setNovaOS({ ...novaOS, valorMaoDeObra: converterMoedaParaNumero(e.target.value) })} 
                  className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} 
                  placeholder="R$ 0,00"
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/30 transition uppercase tracking-wider text-sm">
              {osEmEdicaoId !== null ? 'Salvar Alterações da OS' : 'Salvar e Gerar Ordem de Serviço'}
            </button>
          </form>
        )}

        {abaAtiva === 'ordens' && (
          <div>
            <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
              <h2 className={`text-2xl font-black ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>Gerenciamento de Ordens de Serviço</h2>
              <div className="flex gap-2 bg-slate-500/10 p-1.5 rounded-2xl">
                <button
                  onClick={() => setFiltroOrdens('ativas')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${filtroOrdens === 'ativas' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400'}`}
                >
                  📋 OS Ativas ({ordens.filter(o => !o.deletada).length})
                </button>
                <button
                  onClick={() => setFiltroOrdens('lixeira')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${filtroOrdens === 'lixeira' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400'}`}
                >
                  🗑️ Lixeira ({ordens.filter(o => o.deletada).length})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {ordens.filter(o => filtroOrdens === 'lixeira' ? o.deletada : !o.deletada).map(os => (
                <div key={os.id} className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border flex flex-col md:flex-row justify-between gap-5`}>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-lg text-blue-500">
                        OS #{os.id} {os.garantia && <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold ml-1">GARANTIA</span>}
                      </span>
                      <span className="text-xs bg-slate-500/10 text-slate-400 px-3 py-1 rounded-full font-bold">{os.dataEntrada}</span>
                      <span className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full font-bold">
                        {os.tipo === 'Celular' && <Smartphone size={13} />}
                        {os.tipo === 'Tablet' && <Tablet size={13} />}
                        {os.tipo === 'Notebook' && <Laptop size={13} />}
                        {os.marca} {os.modelo}
                      </span>
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full font-bold">
                        👨‍🔧 Resp: {os.tecnicoNome || 'Geral'}
                      </span>
                      {os.fornecedorNome && (
                        <span className="text-xs bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full font-bold" title="Fornecedor (Confidencial)">
                          📦 Forn: {os.fornecedorNome}
                        </span>
                      )}
                      {os.formaPagamento && (
                        <span className="text-xs bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full font-black">
                          💳 Pgto: {os.formaPagamento}
                        </span>
                      )}
                    </div>
                    <p className={`font-extrabold text-base ${os.lojista ? 'text-red-600 font-black' : (modoNoturno ? 'text-white' : 'text-slate-800')}`}>{os.cliente} {os.lojista && <span className="text-[10px] bg-red-500/20 text-red-600 px-2 py-0.5 rounded-full font-black ml-1">LOJISTA</span>} — <span className="text-slate-400 font-medium">{os.whatsapp}</span></p>
                    <p className="text-sm text-slate-400"><strong>Defeito:</strong> {os.defeito}</p>
                    <p className="text-xs text-slate-500"><strong>Senha:</strong> <span className="font-mono font-bold text-slate-400">{os.senha || 'Não informada'}</span> | <strong>Acessórios:</strong> {os.acessorios || 'Nenhum'}</p>
                  </div>

                  <div className="flex flex-col md:items-end justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <select
                        value={os.status}
                        disabled={os.deletada}
                        onChange={e => atualizarStatus(os.id, e.target.value as StatusOS)}
                        className={`border rounded-2xl px-4 py-2.5 text-xs font-bold ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'} focus:outline-none`}
                      >
                        <option value="Em Análise">Em Análise</option>
                        <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                        <option value="Aguardando Peça">Aguardando Peça</option>
                        <option value="Em Manutenção">Em Manutenção</option>
                        <option value="Pronto">Pronto</option>
                        <option value="Entregue">Entregue</option>
                      </select>
                      
                      {usuarioLogado?.cargo === 'Administrador' && (
                        <span className={`font-black text-lg ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>
                          R$ {(Number(os.valorPecas) + Number(os.valorMaoDeObra)).toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {os.deletada ? (
                        <button onClick={() => restaurarOS(os.id)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-sm transition">
                          <RotateCcw size={14} /> Restaurar OS (Admin)
                        </button>
                      ) : (
                        <>
                          {(os.status === 'Pronto' || os.status === 'Entregue') && (
                            <button onClick={() => reabrirComoGarantia(os.id)} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2.5 rounded-2xl text-xs font-bold transition" title="Reabrir OS em Garantia">
                              <RotateCcw size={14} /> Reabrir OS (Garantia)
                            </button>
                          )}
                          {os.status === 'Entregue' && (
                            <button onClick={() => gerarPdfEEnviarWhatsApp(os)} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 rounded-2xl text-xs font-bold transition" title="Gerar PDF e enviar pelo WhatsApp">
                              <FileText size={14} /> Enviar PDF / WhatsApp
                            </button>
                          )}
                          <button onClick={() => carregarParaEdicao(os)} className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2.5 rounded-2xl text-xs font-bold transition">
                            <Edit3 size={14} /> Editar
                          </button>
                          <button onClick={() => setOsParaFotos(os)} className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2.5 rounded-2xl text-xs font-bold transition">
                            <Camera size={14} /> Fotos ({(os.fotosEntrada?.length || 0) + (os.fotosSaida?.length || 0)})
                          </button>
                          <button onClick={() => {
                            const foneLimpo = os.whatsapp.replace(/\D/g, '');
                            const foneComDDI = foneLimpo.startsWith('55') ? foneLimpo : `55${foneLimpo}`;
                            const total = (Number(os.valorPecas) + Number(os.valorMaoDeObra)).toFixed(2);
                            const msgPgto = os.formaPagamento ? `\n💳 *Forma de Pagamento:* ${os.formaPagamento}` : '';
                            const msgPix = os.formaPagamento === 'Pix' ? `\n\n💳 *Dados para Pagamento Pix*\n*Chave (${configPix.tipoChave}):* ${configPix.chave}\n*Favorecido:* ${configPix.favorecido}` : '';
                            const mensagem = "Olá *" + os.cliente + "*! Aqui é da " + nomeEmpresa + ".\n\n📋 *Ordem de Serviço:* #" + os.id + "\n📱 *Aparelho:* " + os.marca + " " + os.modelo + "\n🔧 *Status Atual:* " + os.status + (usuarioLogado?.cargo === 'Administrador' ? "\n💰 *Valor Total:* R$ " + total : '') + msgPgto + msgPix + "\n\nQualquer dúvida, estamos à disposição!";
                            window.open(`https://wa.me/${foneComDDI}?text=` + encodeURIComponent(mensagem), '_blank');
                          }} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 rounded-2xl text-xs font-bold transition">
                            <MessageCircle size={14} /> WhatsApp
                          </button>
                          <button onClick={() => { setOsParaImprimir(os); setFormatoImpressao('A4'); }} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white px-3.5 py-2.5 rounded-2xl text-xs font-bold transition">
                            <Printer size={14} /> Imprimir
                          </button>
                          <button onClick={() => deletarOS(os.id)} className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-2xl transition" title="Excluir (Admin)">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {abaAtiva === 'tecnicos' && (
          <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border`}>
            <h3 className={`font-black text-lg mb-4 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>Técnicos Registrados no Sistema</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tecnicos.map(t => (
                <div key={t.id} className={`border p-5 rounded-2xl flex items-center justify-between ${modoNoturno ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50/50 border-slate-200'}`}>
                  <div>
                    <span className={`text-xs px-3 py-1 rounded-full font-black ${t.cargo === 'Administrador' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {t.cargo || 'Técnico'}
                    </span>
                    <h4 className={`font-black text-base mt-2 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>{t.nome}</h4>
                    <p className="text-xs text-slate-400 font-medium">{t.especialidade} • <span className="text-blue-400 font-mono">@{t.username}</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">👨‍🔧</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {abaAtiva === 'estoque' && usuarioLogado?.cargo === 'Administrador' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={salvarPecaEstoque} className={`${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border space-y-4 h-fit`}>
              <div className="flex justify-between items-center">
                <h3 className={`font-black text-lg flex items-center gap-2 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>
                  <ShieldCheck className="text-emerald-500" size={22} /> {pecaEmEdicaoId !== null ? 'Editar Peça' : 'Cadastrar Peça'}
                </h3>
                {pecaEmEdicaoId !== null && (
                  <button type="button" onClick={() => { setPecaEmEdicaoId(null); setNovaPeca({ nome: '', categoria: 'Celular', quantidade: 1, minimo: 2, precoCusto: 0, precoVenda: 0 }); }} className="text-xs text-red-500 font-bold hover:underline">
                    Cancelar
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Nome da Peça *</label>
                <input required value={novaPeca.nome} onChange={e => setNovaPeca({ ...novaPeca, nome: e.target.value })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} placeholder="Ex: Bateria iPhone 15" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Qtd Atual</label>
                  <input type="number" value={novaPeca.quantidade} onChange={e => setNovaPeca({ ...novaPeca, quantidade: Number(e.target.value) })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Mínimo</label>
                  <input type="number" value={novaPeca.minimo} onChange={e => setNovaPeca({ ...novaPeca, minimo: Number(e.target.value) })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Custo (R$)</label>
                  <input type="number" step="0.01" value={novaPeca.precoCusto} onChange={e => setNovaPeca({ ...novaPeca, precoCusto: Number(e.target.value) })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Venda (R$)</label>
                  <input type="number" step="0.01" value={novaPeca.precoVenda} onChange={e => setNovaPeca({ ...novaPeca, precoVenda: Number(e.target.value) })} className={`w-full border rounded-2xl p-3.5 text-sm font-semibold transition ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-emerald-500/30 transition uppercase tracking-wider text-xs">
                {pecaEmEdicaoId !== null ? 'Salvar Alterações da Peça' : 'Adicionar ao Estoque'}
              </button>
            </form>

            <div className={`lg:col-span-2 ${modoNoturno ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'} p-6 rounded-3xl shadow-sm border`}>
              <h3 className={`font-black text-lg mb-4 ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>Estoque de Peças</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-inherit text-slate-400 text-xs font-black uppercase">
                      <th className="py-2">Peça</th>
                      <th>Qtd</th>
                      <th>Custo</th>
                      <th>Venda</th>
                      <th className="text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estoque.map(p => (
                      <tr key={p.id} className="border-b border-inherit last:border-0">
                        <td className={`py-3 font-bold ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>{p.nome}</td>
                        <td>
                          <span className={`px-3 py-1 rounded-full text-xs font-black ${p.quantidade <= p.minimo ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {p.quantidade} un
                          </span>
                        </td>
                        <td className="text-slate-400 font-medium">R$ {p.precoCusto.toFixed(2)}</td>
                        <td className={`font-black ${modoNoturno ? 'text-white' : 'text-slate-800'}`}>R$ {p.precoVenda.toFixed(2)}</td>
                        <td className="text-right space-x-2">
                          <button onClick={() => carregarPecaParaEdicao(p)} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition">
                            Editar
                          </button>
                          <button onClick={() => excluirPecaEstoque(p.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded-xl text-xs font-bold transition">
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {modalPagamentoAberto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'} rounded-3xl max-w-sm w-full p-6 shadow-2xl border text-center`}>
            <div className="bg-blue-500/20 text-blue-500 p-3.5 rounded-2xl w-14 h-14 mx-auto mb-4 flex items-center justify-center">
              <DollarSign size={28} />
            </div>
            <h3 className="font-black text-xl mb-2">Forma de Pagamento</h3>
            <p className="text-xs text-slate-400 mb-6 font-medium">Selecione o método utilizado pelo cliente para registrar a entrega da OS:</p>

            <div className="space-y-3">
              <button
                onClick={() => confirmarFormaPagamento('Pix')}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-emerald-500/30 transition uppercase tracking-wider text-xs"
              >
                🟢 Pix
              </button>
              <button
                onClick={() => confirmarFormaPagamento('Débito')}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-blue-500/30 transition uppercase tracking-wider text-xs"
              >
                🔵 Cartão de Débito
              </button>
              <button
                onClick={() => confirmarFormaPagamento('Crédito')}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-purple-500/30 transition uppercase tracking-wider text-xs"
              >
                🟣 Cartão de Crédito
              </button>
            </div>

            <button
              onClick={() => { setModalPagamentoAberto(false); setOsPendentePagamentoId(null); }}
              className="mt-4 text-xs font-bold text-slate-400 hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {modalAdminAberto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <form onSubmit={confirmarLoginAdmin} className={`${modoNoturno ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'} rounded-3xl max-w-sm w-full p-6 shadow-2xl border`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-500/20 text-amber-500 p-3 rounded-2xl">
                <Lock size={22} />
              </div>
              <div>
                <h3 className="font-black text-lg">Acesso Restrito</h3>
                <p className="text-xs text-slate-400">Somente um Administrador pode editar, excluir ou acessar esta área.</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <input
                type="text"
                autoFocus
                required
                value={tentativaAdminUser}
                onChange={e => setTentativaAdminUser(e.target.value)}
                className={`w-full border rounded-2xl p-3 text-sm font-bold ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                placeholder="Usuário Administrador"
              />
              <input
                type="password"
                required
                value={tentativaAdminPass}
                onChange={e => setTentativaAdminPass(e.target.value)}
                className={`w-full border rounded-2xl p-3 text-sm font-bold ${modoNoturno ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
                placeholder="Senha Admin"
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-wider transition">
                Autorizar
              </button>
              <button type="button" onClick={() => setModalAdminAberto(false)} className="bg-slate-500/10 hover:bg-slate-500/20 text-slate-400 font-bold px-4 py-3 rounded-2xl text-xs transition">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {osParaFotos && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-40 print:hidden">
          <div className={`${modoNoturno ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-800'} rounded-3xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border`}>
            <div className="flex justify-between items-center pb-4 border-b border-inherit mb-6">
              <div>
                <h3 className="text-xl font-black">Galeria de Fotos — OS #{osParaFotos.id}</h3>
                <p className="text-sm text-slate-400 font-medium">{osParaFotos.cliente} • {osParaFotos.marca} {osParaFotos.modelo}</p>
              </div>
              <button onClick={() => setOsParaFotos(null)} className="bg-slate-500/10 hover:bg-slate-500/20 px-4 py-2 rounded-2xl text-xs font-bold transition">
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`${modoNoturno ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-50 border-slate-200'} p-4 rounded-3xl border`}>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-black text-sm">1. Fotos de Entrada</h4>
                  <button type="button" onClick={() => setDestinoCamera({ origem: 'os-existente', osId: osParaFotos.id, etapa: 'entrada' })} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition">
                    📷 Câmera
                  </button>
                </div>

                {(!osParaFotos.fotosEntrada || osParaFotos.fotosEntrada.length === 0) ? (
                  <p className="text-xs text-slate-400 py-8 text-center">Nenhuma foto de entrada anexada.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {osParaFotos.fotosEntrada.map((foto, idx) => (
                      <div key={idx} className="relative border rounded-2xl overflow-hidden bg-black shadow-sm">
                        <img src={foto} alt="Entrada" onClick={() => setFotoAmpliada(foto)} className="w-full h-28 object-cover cursor-pointer hover:opacity-90" />
                        <button onClick={() => {
                          const novas = ordens.map(o => o.id === osParaFotos.id ? { ...o, fotosEntrada: o.fotosEntrada.filter((_, i) => i !== idx) } : o);
                          setOrdens(novas);
                          setOsParaFotos(novas.find(o => o.id === osParaFotos.id) || null);
                        }} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1.5 shadow"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`${modoNoturno ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-emerald-50/50 border-emerald-100'} p-4 rounded-3xl border`}>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-black text-emerald-400 text-sm">2. Fotos de Saída</h4>
                  <button type="button" onClick={() => setDestinoCamera({ origem: 'os-existente', osId: osParaFotos.id, etapa: 'saida' })} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition">
                    📷 Câmera
                  </button>
                </div>

                {(!osParaFotos.fotosSaida || osParaFotos.fotosSaida.length === 0) ? (
                  <p className="text-xs text-slate-400 py-8 text-center">Nenhuma foto de saída anexada.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {osParaFotos.fotosSaida.map((foto, idx) => (
                      <div key={idx} className="relative border rounded-2xl overflow-hidden bg-black shadow-sm">
                        <img src={foto} alt="Saída" onClick={() => setFotoAmpliada(foto)} className="w-full h-28 object-cover cursor-pointer hover:opacity-90" />
                        <button onClick={() => {
                          const novas = ordens.map(o => o.id === osParaFotos.id ? { ...o, fotosSaida: o.fotosSaida.filter((_, i) => i !== idx) } : o);
                          setOrdens(novas);
                          setOsParaFotos(novas.find(o => o.id === osParaFotos.id) || null);
                        }} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1.5 shadow"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {destinoCamera && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-slate-900 text-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Camera className="text-blue-400" size={22} />
                <h3 className="font-black text-base">Câmera Ao Vivo</h3>
              </div>
              <button type="button" onClick={() => setDestinoCamera(null)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-2xl text-xs font-bold transition">
                Concluir
              </button>
            </div>

            {erroCamera ? (
              <div className="bg-red-950/60 border border-red-700 text-red-200 p-6 rounded-2xl text-center text-sm my-4">{erroCamera}</div>
            ) : (
              <div className="relative bg-black rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {flashAtivo && <div className="absolute inset-0 bg-white opacity-80 transition-opacity" />}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
              <button type="button" onClick={() => setModoCamera(prev => prev === 'environment' ? 'user' : 'environment')} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-3 rounded-2xl text-xs font-bold transition">
                <RefreshCw size={15} /> Trocar Câmera
              </button>
              <button type="button" onClick={capturarFotoDaCamera} disabled={!!erroCamera} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-blue-500/30 transition uppercase tracking-wider text-xs">
                <Camera size={18} /> Capturar Foto Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {fotoAmpliada && (
        <div onClick={() => setFotoAmpliada(null)} className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 cursor-pointer print:hidden">
          <img src={fotoAmpliada} alt="Zoom" className="max-w-full max-h-[90vh] rounded-3xl shadow-2xl" />
        </div>
      )}

      {osParaImprimir && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-slate-800 rounded-3xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4 pb-3 border-b border-slate-100 print:hidden">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setFormatoImpressao('A4')} className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${formatoImpressao === 'A4' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>
                  Folha A4 (Garantia)
                </button>
                <button onClick={() => setFormatoImpressao('80mm')} className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${formatoImpressao === '80mm' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600'}`}>
                  Cupom 80mm
                </button>
                {formatoImpressao === 'A4' && (
                  <label className="flex items-center gap-1.5 text-xs ml-2 cursor-pointer font-bold text-slate-600">
                    <input type="checkbox" checked={incluirFotosImpressao} onChange={e => setIncluirFotosImpressao(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
                    Incluir fotos
                  </label>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => imprimirEmNovaJanela(osParaImprimir)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-wide shadow-md transition">
                  Imprimir em Nova Janela
                </button>
                <button onClick={() => setOsParaImprimir(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-2xl text-xs font-bold transition">
                  Fechar
                </button>
              </div>
            </div>

            <div id={`os-pdf-${osParaImprimir.id}`} className={formatoImpressao === '80mm' ? 'w-[300px] mx-auto text-xs font-mono bg-white p-4 text-slate-800' : 'text-sm bg-white p-6 text-slate-800'}>
              <div className="border border-slate-200 p-6 rounded-3xl bg-white text-slate-800">
                <div className="text-center border-b border-slate-200 pb-3 mb-4 flex flex-col items-center">
                  <img src={logoCustomizado} alt={nomeEmpresa} style={{ height: `${Math.round(logoAltura * 0.8)}px`, width: 'auto', display: 'block', margin: '0 auto 8px auto', borderRadius: '14px' }} onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
                  <h2 className="font-black text-base text-slate-800">{nomeEmpresa} — ESPECIALISTA EM MANUTENÇÃO</h2>
                  <p className="text-xs text-slate-500 font-medium">Manutenção de Celulares, Tablets e Notebooks</p>
                  <p className="font-black mt-1 text-blue-600 text-sm">ORDEM DE SERVIÇO #{osParaImprimir.id} — {osParaImprimir.dataEntrada}</p>
                </div>

                <div className="space-y-2 mb-4 text-xs font-medium text-slate-700">
                  <p><strong>Cliente:</strong> <span className={osParaImprimir.lojista ? 'text-red-600 font-black' : ''}>{osParaImprimir.cliente}</span> {osParaImprimir.lojista && <span className="text-[10px] bg-red-500/20 text-red-600 px-2 py-0.5 rounded-full font-black ml-1">LOJISTA</span>} | <strong>Tel:</strong> {osParaImprimir.whatsapp}</p>
                  <p><strong>Aparelho:</strong> {osParaImprimir.tipo} - {osParaImprimir.marca} {osParaImprimir.modelo}</p>
                  <p><strong>Técnico Responsável:</strong> {osParaImprimir.tecnicoNome || 'Geral'}</p>
                  <p><strong>Senha / Padrão:</strong> <span className="font-mono font-bold">{osParaImprimir.senha || 'Não informada'}</span></p>
                  <p><strong>Defeito Relatado:</strong> {osParaImprimir.defeito}</p>
                  {osParaImprimir.laudo && <p><strong>Laudo:</strong> {osParaImprimir.laudo}</p>}
                  {osParaImprimir.formaPagamento && <p><strong>Forma de Pagamento:</strong> <span className="text-blue-600 font-bold">{osParaImprimir.formaPagamento}</span></p>}
                </div>

                {formatoImpressao === 'A4' && incluirFotosImpressao && (
                  (osParaImprimir.fotosEntrada && osParaImprimir.fotosEntrada.length > 0) && (
                    <div className="border-t border-slate-200 pt-3 mb-4 space-y-2">
                      <div>
                        <p className="font-bold text-xs mb-1 text-slate-600">Fotos de Entrada:</p>
                        <div className="grid grid-cols-4 gap-2">
                          {osParaImprimir.fotosEntrada.map((f, i) => (
                            <img key={i} src={f} alt="Entrada" className="h-20 w-full object-cover border rounded-2xl" />
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                )}

                {usuarioLogado?.cargo === 'Administrador' && (
                  <div className="border-t border-slate-200 pt-3 mb-4 flex justify-between font-black text-base text-slate-800">
                    <span>VALOR TOTAL:</span>
                    <span>R$ {(Number(osParaImprimir.valorPecas) + Number(osParaImprimir.valorMaoDeObra)).toFixed(2)}</span>
                  </div>
                )}

                {osParaImprimir.formaPagamento === 'Pix' && (
                  <div className="border border-dashed border-slate-400 p-4 rounded-2xl mb-4 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-xs">
                      <p className="font-black text-slate-800 uppercase">💳 Pagamento via Pix</p>
                      <p><strong>Chave ({configPix.tipoChave}):</strong> {configPix.chave}</p>
                      <p><strong>Favorecido:</strong> {configPix.favorecido}</p>
                    </div>
                    {configPix.qrCodeUrl && (
                      <div className="bg-white p-1.5 border rounded-xl shadow-sm" style={{ width: '80px', height: '80px', flexShrink: 0 }}>
                        <img src={configPix.qrCodeUrl} alt="QR Code Pix" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    )}
                  </div>
                )}

                <p className="text-[10px] text-slate-500 mb-8 text-justify leading-relaxed">
                  TERMO DE GARANTIA: Garantia legal de 90 dias sobre o serviço executado, não cobrindo mau uso, quedas ou contato com líquidos após a retirada. Aparelhos não retirados em até 90 dias estarão sujeitos a taxa de armazenamento.
                </p>

                <div className="text-center border-t border-slate-400 pt-1 mt-6 w-64 mx-auto text-xs font-bold text-slate-700">
                  Assinatura do Cliente
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}