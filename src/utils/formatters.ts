export const validarCPF = (cpfStr: string): boolean => {
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

export const formatarChavePix = (tipo: string, valor: string): string => {
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

export const formatarMoedaInput = (valor: number): string => {
  if (!valor || isNaN(valor)) return '';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const converterMoedaParaNumero = (texto: string): number => {
  const apenasNums = texto.replace(/\D/g, '');
  if (!apenasNums) return 0;
  return Number(apenasNums) / 100;
};

export const formatarTitulo = (texto: string): string => {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .split(' ')
    .map(palavra => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(' ');
};

export const comprimirImagem = (arquivo: File): Promise<string> => {
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