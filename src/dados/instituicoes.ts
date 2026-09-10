/* Biblioteca de instituições financeiras pro ícone da carteira (10/09/2026).

   POR QUE NÃO SÃO AS LOGOS REAIS — e o Rafael sabe disso, ficou combinado
   nesta rodada: eu não reproduzo logotipo/marca de terceiro. O que existe
   aqui é um SELO PADRONIZADO: círculo do mesmo tamanho pra todos, com a
   SIGLA da instituição sobre a COR OFICIAL da marca. Fica reconhecível de
   relance (a cor é a parte que o olho reconhece primeiro) sem copiar
   desenho de ninguém.

   E o próprio Rafael decide quando isso não bastar: a tela de escolha tem
   (a) o selo por instituição, (b) "só uma cor" — o círculo liso na cor que
   ele escolher — e (c) "enviar imagem", onde ele pode colocar a logo real
   que quiser, porque a imagem é dele e fica só no aparelho dele.

   As cores foram tomadas da identidade pública de cada marca. Onde a cor não
   era clara o suficiente pra afirmar, entrou um cinza-azulado neutro
   (#5A6B7B) em vez de um palpite — nenhum valor aqui é inventado como se
   fosse oficial.

   Três abas, como pedido: bancos, bandeiras de cartão e emissores/lojas. */
export interface Instituicao {
  nome: string
  /* Cor oficial da marca (hex). */
  cor: string
  /* 2-4 letras que aparecem dentro do círculo. */
  sigla: string
}

export const BANCOS: Instituicao[] = [
  { nome: 'Banco do Brasil', cor: '#FAE128', sigla: 'BB' },
  { nome: 'Bradesco', cor: '#CC092F', sigla: 'BRA' },
  { nome: 'Itaú Unibanco', cor: '#EC7000', sigla: 'ITA' },
  { nome: 'Santander', cor: '#EC0000', sigla: 'SAN' },
  { nome: 'Caixa Econômica Federal', cor: '#0070AF', sigla: 'CEF' },
  { nome: 'Nubank', cor: '#820AD1', sigla: 'NU' },
  { nome: 'Inter', cor: '#FF7A00', sigla: 'INT' },
  { nome: 'C6 Bank', cor: '#242424', sigla: 'C6' },
  { nome: 'BTG Pactual', cor: '#0A1A2F', sigla: 'BTG' },
  { nome: 'Banco Original', cor: '#00A868', sigla: 'ORI' },
  { nome: 'Banco Safra', cor: '#0C2340', sigla: 'SAF' },
  { nome: 'Banrisul', cor: '#0057A6', sigla: 'BRI' },
  { nome: 'Banestes', cor: '#005CA9', sigla: 'BNS' },
  { nome: 'Banco do Nordeste', cor: '#005CAB', sigla: 'BNB' },
  { nome: 'Banco da Amazônia', cor: '#00954C', sigla: 'BASA' },
  { nome: 'Sicoob', cor: '#003641', sigla: 'SIC' },
  { nome: 'Sicredi', cor: '#3FA110', sigla: 'SICR' },
  { nome: 'Unicred', cor: '#5A6B7B', sigla: 'UNI' },
  { nome: 'Banco Pan', cor: '#005CA9', sigla: 'PAN' },
  { nome: 'Banco BMG', cor: '#F58220', sigla: 'BMG' },
  { nome: 'Banco Daycoval', cor: '#003B71', sigla: 'DAY' },
  { nome: 'Banco Pine', cor: '#00447C', sigla: 'PIN' },
  { nome: 'Banco Sofisa', cor: '#E30613', sigla: 'SOF' },
  { nome: 'Banco Modal', cor: '#000000', sigla: 'MOD' },
  { nome: 'Banco ABC Brasil', cor: '#003B71', sigla: 'ABC' },
  { nome: 'Banco Alfa', cor: '#004B8D', sigla: 'ALF' },
  { nome: 'Banco Rendimento', cor: '#004F9F', sigla: 'REN' },
  { nome: 'Banco Topázio', cor: '#5A6B7B', sigla: 'TOP' },
  { nome: 'Banco Paulista', cor: '#003366', sigla: 'PAU' },
  { nome: 'Banco Fibra', cor: '#005EB8', sigla: 'FIB' },
  { nome: 'Banco Máxima', cor: '#003399', sigla: 'MAX' },
  { nome: 'Banco Semear', cor: '#8CC63F', sigla: 'SEM' },
  { nome: 'Banco Genial', cor: '#111111', sigla: 'GEN' },
  { nome: 'Banco Master', cor: '#0B0B0B', sigla: 'MAS' },
  { nome: 'Banco Letsbank', cor: '#1B4F9C', sigla: 'LET' },
  { nome: 'Banco Bari', cor: '#00A3E0', sigla: 'BARI' },
  { nome: 'Neon', cor: '#00E5D0', sigla: 'NEO' },
  { nome: 'Next', cor: '#00E88F', sigla: 'NEX' },
  { nome: 'PagBank', cor: '#0F9D58', sigla: 'PAG' },
  { nome: 'Mercado Pago', cor: '#009EE3', sigla: 'MP' },
  { nome: 'PicPay', cor: '#11C76F', sigla: 'PIC' },
  { nome: 'Stone', cor: '#0DB14B', sigla: 'STO' },
  { nome: 'Ton', cor: '#0DB14B', sigla: 'TON' },
  { nome: 'Cora', cor: '#FE3E6D', sigla: 'COR' },
  { nome: 'Conta Simples', cor: '#4B31DD', sigla: 'CS' },
  { nome: 'Asaas', cor: '#0057FF', sigla: 'ASA' },
  { nome: 'Iti Itaú', cor: '#EC7000', sigla: 'ITI' },
  { nome: 'Digio', cor: '#0033A0', sigla: 'DIG' },
  { nome: 'Agibank', cor: '#5A6B7B', sigla: 'AGI' },
  { nome: 'Banco Bmg Help', cor: '#F58220', sigla: 'HLP' },
  { nome: 'Banco Cetelem', cor: '#00915A', sigla: 'CET' },
  { nome: 'Banco Cifra', cor: '#004A99', sigla: 'CIF' },
  { nome: 'Banco Crefisa', cor: '#E4002B', sigla: 'CRE' },
  { nome: 'Banco Mercantil do Brasil', cor: '#00693E', sigla: 'MB' },
  { nome: 'Banco Triângulo (Tribanco)', cor: '#E30613', sigla: 'TRI' },
  { nome: 'Banco Votorantim (BV)', cor: '#5A6B7B', sigla: 'BV' },
  { nome: 'Banco Guanabara', cor: '#004990', sigla: 'GUA' },
  { nome: 'Banco Industrial do Brasil', cor: '#00447C', sigla: 'BIB' },
  { nome: 'Banco Luso Brasileiro', cor: '#005EB8', sigla: 'LUS' },
  { nome: 'Banco Rodobens', cor: '#0033A1', sigla: 'ROD' },
  { nome: 'Banco Sicredi Pactual', cor: '#3FA110', sigla: 'SIP' },
  { nome: 'Banco Bocom BBM', cor: '#B8232F', sigla: 'BBM' },
  { nome: 'Banco Arbi', cor: '#00447C', sigla: 'ARB' },
  { nome: 'Banco Andbank', cor: '#003057', sigla: 'AND' },
  { nome: 'Banco Woori', cor: '#0067AC', sigla: 'WOO' },
  { nome: 'Banco Fator', cor: '#00447C', sigla: 'FAT' },
  { nome: 'Banco Bnp Paribas Brasil', cor: '#00915A', sigla: 'BNP' },
  { nome: 'Banco J.P. Morgan', cor: '#3A3A3A', sigla: 'JPM' },
  { nome: 'Banco Citibank', cor: '#003B70', sigla: 'CITI' },
  { nome: 'Banco Credit Suisse', cor: '#0F1C2E', sigla: 'CSU' },
  { nome: 'Banco Morgan Stanley', cor: '#003057', sigla: 'MS' },
  { nome: 'Banco Goldman Sachs', cor: '#6C7C8C', sigla: 'GS' },
  { nome: 'Banco Deutsche', cor: '#0018A8', sigla: 'DB' },
  { nome: 'Banco Rabobank', cor: '#FF6600', sigla: 'RAB' },
  { nome: 'Banco Sumitomo Mitsui', cor: '#5A6B7B', sigla: 'SMBC' },
  { nome: 'Banco MUFG Brasil', cor: '#E60012', sigla: 'MUFG' },
  { nome: 'Banco Bank of America', cor: '#012169', sigla: 'BOA' },
  { nome: 'Banco Scotiabank Brasil', cor: '#EC111A', sigla: 'SCO' },
  { nome: 'Banco John Deere', cor: '#367C2B', sigla: 'JD' },
  { nome: 'Banco Caterpillar', cor: '#FFCD11', sigla: 'CAT' },
  { nome: 'Banco Volkswagen', cor: '#001E50', sigla: 'VW' },
  { nome: 'Banco Toyota', cor: '#EB0A1E', sigla: 'TOY' },
  { nome: 'Banco Honda', cor: '#CC0000', sigla: 'HON' },
  { nome: 'Banco GM', cor: '#005DAA', sigla: 'GM' },
  { nome: 'Banco Ford', cor: '#003478', sigla: 'FOR' },
  { nome: 'Banco Fiat (Banco Fidis)', cor: '#941F35', sigla: 'FIA' },
  { nome: 'Banco Mercedes-Benz', cor: '#00A19B', sigla: 'MBZ' },
  { nome: 'Banco Hyundai Capital', cor: '#002C5F', sigla: 'HYU' },
  { nome: 'Banco PSA (Stellantis)', cor: '#003C71', sigla: 'STE' },
  { nome: 'Banco Volvo', cor: '#003057', sigla: 'VOL' },
  { nome: 'Banco Randon', cor: '#E30613', sigla: 'RAN' },
  { nome: 'Banco Yamaha', cor: '#0033A0', sigla: 'YAM' },
  { nome: 'Banco RCI Brasil', cor: '#FFCC33', sigla: 'RCI' },
  { nome: 'Banco Moneo', cor: '#004990', sigla: 'MON' },
  { nome: 'Banco Ribeirão Preto', cor: '#005CA9', sigla: 'BRP' },
  { nome: 'Banco Bs2', cor: '#5A6B7B', sigla: 'BS2' },
  { nome: 'Banco Omni', cor: '#F26522', sigla: 'OMN' },
  { nome: 'Banco Itaú BBA', cor: '#EC7000', sigla: 'IBBA' },
  { nome: 'Banco Bradesco BBI', cor: '#CC092F', sigla: 'BBI' },
  { nome: 'Banco Votorantim Wealth', cor: '#00A0DF', sigla: 'BVW' },
  { nome: 'Banco Nordeste Digital', cor: '#005CAB', sigla: 'BND' },
  { nome: 'Banco Inbursa', cor: '#0072BC', sigla: 'INB' },
  { nome: 'Banco Ourinvest', cor: '#0B3B60', sigla: 'OUR' },
  { nome: 'Banco Pottencial', cor: '#0C2340', sigla: 'POT' },
  { nome: 'Banco Master Múltiplo', cor: '#0B0B0B', sigla: 'BMM' },
  { nome: 'Banco Digimais', cor: '#00A65A', sigla: 'DGM' },
  { nome: 'Banco Capital', cor: '#004990', sigla: 'CAP' },
  { nome: 'Banco Finaxis', cor: '#0057A6', sigla: 'FNX' },
  { nome: 'Banco Western Union Brasil', cor: '#FFDD00', sigla: 'WU' },
  { nome: 'Banco Travelex', cor: '#E4002B', sigla: 'TVX' },
  { nome: 'Banco Haitong', cor: '#C8102E', sigla: 'HAI' },
  { nome: 'Banco China Construction (CCB)', cor: '#0B4EA2', sigla: 'CCB' },
  { nome: 'Banco ICBC Brasil', cor: '#C8102E', sigla: 'ICBC' },
  { nome: 'Banco Bocom', cor: '#B8232F', sigla: 'BOC' },
  { nome: 'Banco Pine Investimentos', cor: '#00447C', sigla: 'PII' },
  { nome: 'Banco XP', cor: '#0A0A0A', sigla: 'XP' },
  { nome: 'Rico Investimentos', cor: '#F5A623', sigla: 'RIC' },
  { nome: 'Clear Corretora', cor: '#0A0A0A', sigla: 'CLR' },
  { nome: 'Órama', cor: '#F04E23', sigla: 'ORA' },
  { nome: 'Warren', cor: '#111827', sigla: 'WAR' },
  { nome: 'Toro Investimentos', cor: '#00C1A5', sigla: 'TOR' },
  { nome: 'Genial Investimentos', cor: '#111111', sigla: 'GNL' },
  { nome: 'Ágora Investimentos', cor: '#CC092F', sigla: 'AGO' },
  { nome: 'Easynvest / Nu Invest', cor: '#820AD1', sigla: 'NUI' },
  { nome: 'Avenue', cor: '#0A2540', sigla: 'AVE' },
  { nome: 'Banco Sofisa Direto', cor: '#E30613', sigla: 'SFD' },
  { nome: 'Banco Bari Digital', cor: '#00A3E0', sigla: 'BRD' },
  { nome: 'Banco Neon Pagamentos', cor: '#00E5D0', sigla: 'NEP' },
  { nome: 'Banco Will', cor: '#7B2FF7', sigla: 'WIL' },
  { nome: 'Banco Superdigital', cor: '#EC0000', sigla: 'SUP' },
  { nome: 'Banco AME Digital', cor: '#FF6B00', sigla: 'AME' },
  { nome: 'Banco 99Pay', cor: '#FFD400', sigla: '99P' },
  { nome: 'RecargaPay', cor: '#00C08B', sigla: 'RCP' },
  { nome: 'Banco Zema', cor: '#E30613', sigla: 'ZEM' },
  { nome: 'Banco Bmp Money Plus', cor: '#0057A6', sigla: 'BMP' },
  { nome: 'Banco Grafeno', cor: '#00C2A8', sigla: 'GRA' },
  { nome: 'Banco Braza', cor: '#004990', sigla: 'BRZ' },
  { nome: 'Banco Btg Empresas', cor: '#0A1A2F', sigla: 'BTGE' },
  { nome: 'Banco Itaú Empresas', cor: '#EC7000', sigla: 'ITAE' },
  { nome: 'Banco Bradesco Empresas', cor: '#CC092F', sigla: 'BRAE' },
  { nome: 'Banco Santander Empresas', cor: '#EC0000', sigla: 'SANE' },
  { nome: 'Efí (Gerencianet)', cor: '#F58220', sigla: 'EFI' },
  { nome: 'Juno', cor: '#00C08B', sigla: 'JUN' },
  { nome: 'Celcoin', cor: '#00A859', sigla: 'CEL' },
  { nome: 'Zoop', cor: '#7B2FF7', sigla: 'ZOO' },
  { nome: 'Cielo Conta', cor: '#0033A0', sigla: 'CIC' },
  { nome: 'Rede Conta', cor: '#E4002B', sigla: 'REC' },
  { nome: 'SumUp Bank', cor: '#1B1B1B', sigla: 'SUM' },
  { nome: 'InfinitePay', cor: '#00E599', sigla: 'IPY' },
  { nome: 'Banco Rendimento Câmbio', cor: '#004F9F', sigla: 'RCB' },
  { nome: 'Banco Nubank PJ', cor: '#820AD1', sigla: 'NUPJ' },
  { nome: 'Banco Cresol', cor: '#00954C', sigla: 'CRS' },
  { nome: 'Banco Ailos', cor: '#5A6B7B', sigla: 'AIL' },
  { nome: 'Banco Uniprime', cor: '#003C71', sigla: 'UPR' },
  { nome: 'Banco Cecred', cor: '#00954C', sigla: 'CEC' },
  { nome: 'Banco Confe', cor: '#0057A6', sigla: 'CNF' },
  { nome: 'Banco Credisis', cor: '#E30613', sigla: 'CDS' },
  { nome: 'Banco Credisan', cor: '#5A6B7B', sigla: 'CDN' },
  { nome: 'Banco Coopcentral', cor: '#0C6E4F', sigla: 'CCE' },
]

export const BANDEIRAS: Instituicao[] = [
  { nome: 'Visa', cor: '#1A1F71', sigla: 'VISA' },
  { nome: 'Mastercard', cor: '#EB001B', sigla: 'MC' },
  { nome: 'Elo', cor: '#FFCB05', sigla: 'ELO' },
  { nome: 'American Express', cor: '#2E77BC', sigla: 'AMEX' },
  { nome: 'Hipercard', cor: '#B3131B', sigla: 'HIP' },
  { nome: 'Diners Club', cor: '#0079BE', sigla: 'DIN' },
  { nome: 'Discover', cor: '#F76B1C', sigla: 'DISC' },
  { nome: 'JCB', cor: '#0E4C96', sigla: 'JCB' },
  { nome: 'UnionPay', cor: '#E21836', sigla: 'UP' },
  { nome: 'Cabal', cor: '#E30613', sigla: 'CAB' },
  { nome: 'Sorocred', cor: '#B22222', sigla: 'SOR' },
  { nome: 'Banescard', cor: '#005CA9', sigla: 'BSC' },
  { nome: 'Aura', cor: '#7B2FF7', sigla: 'AUR' },
  { nome: 'Credz', cor: '#E4002B', sigla: 'CRZ' },
  { nome: 'Alelo', cor: '#5A6B7B', sigla: 'ALE' },
  { nome: 'Sodexo', cor: '#0033A0', sigla: 'SOD' },
  { nome: 'Ticket', cor: '#E4002B', sigla: 'TIC' },
  { nome: 'VR Benefícios', cor: '#5A6B7B', sigla: 'VR' },
  { nome: 'Ben Visa Vale', cor: '#1A1F71', sigla: 'BEN' },
  { nome: 'Flash Benefícios', cor: '#FF3E3E', sigla: 'FLA' },
  { nome: 'Caju', cor: '#FF5C39', sigla: 'CAJ' },
  { nome: 'Swile', cor: '#FF5A5F', sigla: 'SWI' },
  { nome: 'Pluxee', cor: '#7B2FF7', sigla: 'PLX' },
]

export const EMISSORES: Instituicao[] = [
  { nome: 'Porto Seguro', cor: '#0A2896', sigla: 'POR' },
  { nome: 'Losango', cor: '#CC092F', sigla: 'LOS' },
  { nome: 'Renner (Realize)', cor: '#E30613', sigla: 'REN' },
  { nome: 'Riachuelo (Midway)', cor: '#E4002B', sigla: 'RIA' },
  { nome: 'C&A Pay', cor: '#0072CE', sigla: 'C&A' },
  { nome: 'Marisa (SAX)', cor: '#E4007C', sigla: 'MAR' },
  { nome: 'Pernambucanas', cor: '#E30613', sigla: 'PER' },
  { nome: 'Casas Bahia (banQi)', cor: '#0033A0', sigla: 'CB' },
  { nome: 'Ponto (banQi)', cor: '#5A6B7B', sigla: 'PON' },
  { nome: 'Magalu Pay', cor: '#0086FF', sigla: 'MGL' },
  { nome: 'Americanas Card', cor: '#E4002B', sigla: 'AME2' },
  { nome: 'Carrefour Soluções Financeiras', cor: '#004E9F', sigla: 'CAR' },
  { nome: 'Atacadão Card', cor: '#F58220', sigla: 'ATA' },
  { nome: 'Extra Card', cor: '#E4002B', sigla: 'EXT' },
  { nome: 'Pão de Açúcar Card', cor: '#5A6B7B', sigla: 'PDA' },
  { nome: 'Assaí Card', cor: '#E30613', sigla: 'ASS' },
  { nome: 'Havan Card', cor: '#0033A0', sigla: 'HAV' },
  { nome: 'Leader Card', cor: '#E4007C', sigla: 'LEA' },
  { nome: 'Avista Card', cor: '#F58220', sigla: 'AVI' },
  { nome: 'Cencosud (Card)', cor: '#5A6B7B', sigla: 'CEN' },
  { nome: 'Credsystem', cor: '#0057A6', sigla: 'CSY' },
  { nome: 'Credi21', cor: '#E30613', sigla: 'C21' },
  { nome: 'Cetelem Aura', cor: '#00915A', sigla: 'CTA' },
  { nome: 'Will Bank Card', cor: '#7B2FF7', sigla: 'WLB' },
  { nome: 'Méliuz (Bankly)', cor: '#00C08B', sigla: 'MEL' },
  { nome: 'Banco Cbss (Ourocard)', cor: '#FAE128', sigla: 'CBSS' },
  { nome: 'Ourocard', cor: '#FAE128', sigla: 'OUC' },
  { nome: 'Bradescard', cor: '#CC092F', sigla: 'BRC' },
  { nome: 'Itaucard', cor: '#EC7000', sigla: 'ITC' },
  { nome: 'Credicard', cor: '#E4002B', sigla: 'CRC' },
  { nome: 'Santander Free', cor: '#EC0000', sigla: 'SFR' },
  { nome: 'Unicard', cor: '#5A6B7B', sigla: 'UNC' },
  { nome: 'Sicredi Card', cor: '#3FA110', sigla: 'SCC' },
  { nome: 'Sicoob Card', cor: '#003641', sigla: 'SBC' },
  { nome: 'Caixa Card', cor: '#0070AF', sigla: 'CXC' },
  { nome: 'BRB Card', cor: '#5A6B7B', sigla: 'BRB' },
  { nome: 'Banese Card', cor: '#0057A6', sigla: 'BNC' },
  { nome: 'Banpará Card', cor: '#0072BC', sigla: 'BPA' },
  { nome: 'Banestes Card', cor: '#005CA9', sigla: 'BSTC' },
  { nome: 'Amazonas Card', cor: '#00954C', sigla: 'AMC' },
  { nome: 'Sacon (Sicred)', cor: '#3FA110', sigla: 'SAC' },
  { nome: 'Digio Card', cor: '#0033A0', sigla: 'DGC' },
  { nome: 'Neon Card', cor: '#00E5D0', sigla: 'NNC' },
  { nome: 'Next Card', cor: '#00E88F', sigla: 'NXC' },
  { nome: 'PagBank Card', cor: '#0F9D58', sigla: 'PGC' },
  { nome: 'Mercado Pago Card', cor: '#009EE3', sigla: 'MPC' },
  { nome: 'PicPay Card', cor: '#11C76F', sigla: 'PPC' },
  { nome: 'Inter Card', cor: '#FF7A00', sigla: 'INC' },
  { nome: 'C6 Card', cor: '#242424', sigla: 'C6C' },
  { nome: 'BTG Card', cor: '#0A1A2F', sigla: 'BTC' },
  { nome: 'XP Visa Infinite', cor: '#0A0A0A', sigla: 'XPC' },
  { nome: 'Nubank Ultravioleta', cor: '#820AD1', sigla: 'NUV' },
  { nome: 'Azul Itaucard', cor: '#0033A0', sigla: 'AZU' },
  { nome: 'Smiles (Gol)', cor: '#FF6600', sigla: 'SMI' },
  { nome: 'LATAM Pass', cor: '#1B0088', sigla: 'LAT' },
  { nome: 'TudoAzul', cor: '#0033A0', sigla: 'TAZ' },
  { nome: 'Livelo', cor: '#E4007C', sigla: 'LIV' },
  { nome: 'Esfera Santander', cor: '#EC0000', sigla: 'ESF' },
  { nome: 'Km de Vantagens', cor: '#5A6B7B', sigla: 'KMV' },
]

export const ABAS_INSTITUICAO = [
  { chave: 'bancos' as const, rotulo: 'Bancos', itens: BANCOS },
  { chave: 'bandeiras' as const, rotulo: 'Bandeiras', itens: BANDEIRAS },
  { chave: 'emissores' as const, rotulo: 'Cartões/Lojas', itens: EMISSORES },
]

export const TODAS_INSTITUICOES: Instituicao[] = [...BANCOS, ...BANDEIRAS, ...EMISSORES]

export function acharInstituicao(nome?: string): Instituicao | undefined {
  if (!nome) return undefined
  return TODAS_INSTITUICOES.find((i) => i.nome === nome)
}

/* Casa o NOME DE ARQUIVO de uma imagem com uma instituição da lista
   (10/09/2026) — é o que faz a importação em lote funcionar: o Rafael solta
   `nubank.png`, `banco-do-brasil.svg`, `Itau.jpg` e cada um vai pro lugar
   certo sozinho. Compara sem acento, sem pontuação e sem espaço, aceitando
   também a sigla (`bb.png`, `cef.png`). Devolve `undefined` quando não tem
   certeza — nunca chuta, pra não colocar a logo de um banco em cima de
   outro. */
function normalizar(t: string) {
  return t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
}
export function casarArquivoComInstituicao(nomeArquivo: string): Instituicao | undefined {
  const base = normalizar(nomeArquivo.replace(/\.[^.]+$/, ''))
  if (!base) return undefined
  const porNome = TODAS_INSTITUICOES.find((i) => normalizar(i.nome) === base)
  if (porNome) return porNome
  const porSigla = TODAS_INSTITUICOES.find((i) => normalizar(i.sigla) === base)
  if (porSigla) return porSigla
  /* Encaixe parcial só quando UMA única instituição contém o texto — com
     duas ou mais candidatas, devolve `undefined` em vez de escolher. */
  const contem = TODAS_INSTITUICOES.filter((i) => normalizar(i.nome).includes(base) || base.includes(normalizar(i.nome)))
  return contem.length === 1 ? contem[0] : undefined
}
