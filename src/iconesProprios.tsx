/* Ícones próprios, desenhados na gramática do Heroicons (build 089).

   POR QUE ESTE ARQUIVO EXISTE. O pedido do Rafael foi: "quero ter um ícone de
   proposta par pra cada ícone colorido, sendo uma versão dele em 'Apenas
   borda' e outra 'Preenchido'... não precisa ser o mesmo desenho, mas muito
   próximo, que tenha o mesmo significado".

   A biblioteca já tinha os três estilos por entrada (`outline`, `solid`,
   `emoji`), então "existir um par" nunca foi o problema. O problema era o
   SIGNIFICADO: o Heroicons é um conjunto de interface, não de pictogramas de
   domínio, e simplesmente não tem bomba de combustível, xícara de café,
   caneca de chope, cachorro, porquinho, halter nem talher. Os ids desses
   conceitos vinham, desde 01/09/2026, apontando para o Heroicon "mais ou
   menos" mais próximo — e o comentário original em `icones.tsx` já admitia
   isso ("alguns mapeamentos são aproximações por falta de ícone exato, ex.:
   `pet`→coração, `cofrinho`→arquivo, `café`→loja").

   O resultado prático era o oposto do pedido: no "3D colorido" a categoria
   Pets aparecia como 🐶 e, ao trocar o pacote para "Apenas borda", virava um
   CORAÇÃO. Mesma categoria, dois significados. Cofrinho virava uma caixa de
   arquivo, Café virava uma loja, Combustível virava um raio de eletricidade.

   A saída honesta é desenhar o que falta, em vez de (a) fingir que o par
   existe ou (b) trocar o emoji para caber na limitação do Heroicons — que
   pioraria justamente o estilo que hoje está certo.

   REGRAS DE DESENHO (as mesmas do Heroicons 24, para os ícones conviverem na
   mesma grade sem parecerem de outro conjunto):
   • viewBox 0 0 24 24, sempre.
   • Contorno: `fill="none"`, `stroke="currentColor"`, `stroke-width="1.5"`,
     junções e pontas arredondadas.
   • Preenchido: `fill="currentColor"`, sem stroke, `fill-rule="evenodd"`
     quando precisa de furo (o olho do cachorro, a fresta do porquinho).
   • A cor NUNCA é escrita aqui: é sempre `currentColor`, porque quem define a
     cor é o `Icone` (`style={{ color }}`) — é isso que faz "aplicar uma cor a
     todos os ícones de uma vez" funcionar nestes também.
   • Nada de `<title>`: quem cuida da acessibilidade é o `Icone`, que já marca
     `aria-hidden` no contorno/preenchido e usa `aria-label` no emoji. */
import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement>

const baseContorno = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  xmlns: 'http://www.w3.org/2000/svg',
}
const basePreenchido = {
  viewBox: '0 0 24 24',
  fill: 'currentColor',
  xmlns: 'http://www.w3.org/2000/svg',
}

/* ---------------------------------------------------------------- combustível
   Bomba de posto: corpo retangular com visor, mangueira à direita subindo. */
const D_BOMBA_CORPO = 'M4 20.25V5.25A1.5 1.5 0 0 1 5.5 3.75h6A1.5 1.5 0 0 1 13 5.25v15'
const D_BOMBA_BASE = 'M2.75 20.25h11.5'
const D_BOMBA_VISOR = 'M6 6.75h5v3.5H6z'
const D_BOMBA_MANGUEIRA = 'M13 9.25h2.75a1.5 1.5 0 0 1 1.5 1.5v6a1.75 1.75 0 0 0 3.5 0V8.5l-2-2'
export const BombaCombustivelContorno = (p: P) => (
  <svg {...baseContorno} {...p}>
    <path d={D_BOMBA_CORPO} />
    <path d={D_BOMBA_BASE} />
    <path d={D_BOMBA_VISOR} />
    <path d={D_BOMBA_MANGUEIRA} />
  </svg>
)
export const BombaCombustivelPreenchido = (p: P) => (
  <svg {...basePreenchido} {...p}>
    <path
      fillRule="evenodd"
      d="M5.5 3h6A2.25 2.25 0 0 1 13.75 5.25V8.5h2a2.25 2.25 0 0 1 2.25 2.25v6a1 1 0 0 0 2 0V8.81l-1.78-1.78a.75.75 0 1 1 1.06-1.06l2 2a.75.75 0 0 1 .22.53v8.25a2.5 2.5 0 0 1-5 0v-6a.75.75 0 0 0-.75-.75h-2v8.25h.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5h.5V5.25A2.25 2.25 0 0 1 5.5 3Zm.5 3.75a.75.75 0 0 0-.75.75v3.5c0 .414.336.75.75.75h5a.75.75 0 0 0 .75-.75V7.5a.75.75 0 0 0-.75-.75H6Z"
      clipRule="evenodd"
    />
  </svg>
)

/* --------------------------------------------------------------------- café
   Xícara com pires e o vapor subindo. */
const D_CAFE_XICARA = 'M4 10.5h11v4.25A4.25 4.25 0 0 1 10.75 19h-2.5A4.25 4.25 0 0 1 4 14.75z'
const D_CAFE_ALCA = 'M15 11.75h1.75a2.25 2.25 0 0 1 0 4.5H15'
const D_CAFE_PIRES = 'M2.75 21.25h13.5'
const D_CAFE_VAPOR1 = 'M7.5 3.25c-.8.9-.8 1.85 0 2.75s.8 1.85 0 2.75'
const D_CAFE_VAPOR2 = 'M11.25 3.25c-.8.9-.8 1.85 0 2.75s.8 1.85 0 2.75'
export const CafeContorno = (p: P) => (
  <svg {...baseContorno} {...p}>
    <path d={D_CAFE_VAPOR1} />
    <path d={D_CAFE_VAPOR2} />
    <path d={D_CAFE_XICARA} />
    <path d={D_CAFE_ALCA} />
    <path d={D_CAFE_PIRES} />
  </svg>
)
export const CafePreenchido = (p: P) => (
  <svg {...basePreenchido} {...p}>
    <path d="M7.5 2.72a.75.75 0 0 1 .06 1.06c-.54.6-.54 1.04 0 1.64.94 1.05.94 2.38 0 3.44a.75.75 0 1 1-1.12-1c.54-.6.54-1.04 0-1.64-.94-1.06-.94-2.39 0-3.44a.75.75 0 0 1 1.06-.06ZM11.25 2.72a.75.75 0 0 1 .06 1.06c-.54.6-.54 1.04 0 1.64.94 1.05.94 2.38 0 3.44a.75.75 0 1 1-1.12-1c.54-.6.54-1.04 0-1.64-.94-1.06-.94-2.39 0-3.44a.75.75 0 0 1 1.06-.06Z" />
    <path
      fillRule="evenodd"
      d="M3.25 10.5a.75.75 0 0 1 .75-.75h11a.75.75 0 0 1 .75.75v.5h1a3 3 0 0 1 0 6h-1.34a5 5 0 0 1-3.16 2.39v1.11h3a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5h3v-1.11A5 5 0 0 1 3.25 14.75V10.5Zm12.5 5h1a1.5 1.5 0 0 0 0-3h-1v3Z"
      clipRule="evenodd"
    />
  </svg>
)

/* ---------------------------------------------------------------------- bar
   Caneca de chope: corpo, alça, colarinho e as linhas do vidro. */
const D_CANECA_CORPO = 'M5 6.75h9.5v11.5A2.25 2.25 0 0 1 12.25 20.5h-5A2.25 2.25 0 0 1 5 18.25z'
const D_CANECA_ALCA = 'M14.5 9h2.25a2.25 2.25 0 0 1 2.25 2.25v3A2.25 2.25 0 0 1 16.75 16.5H14.5'
const D_CANECA_COLARINHO = 'M5 10.25h9.5'
const D_CANECA_ESPUMA = 'M6.25 6.75a2 2 0 0 1 1.6-3.2 2.6 2.6 0 0 1 4.3 0 2 2 0 0 1 1.6 3.2'
export const CanecaContorno = (p: P) => (
  <svg {...baseContorno} {...p}>
    <path d={D_CANECA_ESPUMA} />
    <path d={D_CANECA_CORPO} />
    <path d={D_CANECA_COLARINHO} />
    <path d={D_CANECA_ALCA} />
  </svg>
)
export const CanecaPreenchido = (p: P) => (
  <svg {...basePreenchido} {...p}>
    <path
      fillRule="evenodd"
      d="M9.7 2.5a3.35 3.35 0 0 0-2.5 1.12A2.75 2.75 0 0 0 5.03 6.9a.75.75 0 0 0-.78.75v10.6A3 3 0 0 0 7.25 21.25h5a3 3 0 0 0 3-3V17.25h1.5a3 3 0 0 0 3-3v-3a3 3 0 0 0-3-3h-1.53a2.75 2.75 0 0 0-2.02-3.28A3.35 3.35 0 0 0 9.7 2.5Zm5.55 7.25v6h1.5a1.5 1.5 0 0 0 1.5-1.5v-3a1.5 1.5 0 0 0-1.5-1.5h-1.5Zm-9.5 1.25h8v-1.5h-8v1.5Z"
      clipRule="evenodd"
    />
  </svg>
)

/* ---------------------------------------------------------------------- pet
   Cabeça de cachorro: orelhas caídas, focinho e olhos. */
const D_PET_CABECA = 'M12 20.25c3.6 0 6-2.35 6-5.75 0-2.1-.6-3.9-1.5-5.25V4.6c0-.55-.6-.9-1.07-.62L13.4 5.2a7.6 7.6 0 0 0-2.8 0L8.57 3.98C8.1 3.7 7.5 4.05 7.5 4.6v4.65C6.6 10.6 6 12.4 6 14.5c0 3.4 2.4 5.75 6 5.75Z'
const D_PET_FOCINHO = 'M12 15.25a1.6 1.6 0 0 0 1.6-1.25h-3.2A1.6 1.6 0 0 0 12 15.25Z'
export const PetContorno = (p: P) => (
  <svg {...baseContorno} {...p}>
    <path d={D_PET_CABECA} />
    <path d={D_PET_FOCINHO} />
    <path d="M9.75 11.75h.01" />
    <path d="M14.25 11.75h.01" />
  </svg>
)
export const PetPreenchido = (p: P) => (
  <svg {...basePreenchido} {...p}>
    <path
      fillRule="evenodd"
      d="M8.2 3.35A1.5 1.5 0 0 0 6 4.6v4.4C5.1 10.5 4.5 12.35 4.5 14.5c0 4.3 3.1 7.25 7.5 7.25s7.5-2.95 7.5-7.25c0-2.15-.6-4-1.5-5.5V4.6a1.5 1.5 0 0 0-2.2-1.25l-1.75 1.03a9.1 9.1 0 0 0-4.1 0L8.2 3.35ZM9.75 12.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm4.5 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2ZM9.6 14.5h4.8a2.35 2.35 0 0 1-4.8 0Z"
      clipRule="evenodd"
    />
  </svg>
)

/* ----------------------------------------------------------------- cofrinho
   Porquinho: corpo, orelha, focinho, pernas e a fresta da moeda em cima. */
const D_PORCO_CORPO = 'M2.75 12.5c0-3.3 3.25-5.75 7.5-5.75 1 0 1.95.13 2.8.38l2.1-1.5c.42-.3.98.05.9.56l-.4 2.4c1.3.9 2.15 2.1 2.35 3.41h1.35c.5 0 .9.4.9.9v2.2c0 .5-.4.9-.9.9h-1.6c-.45.86-1.16 1.6-2.05 2.15v1.6c0 .5-.4.9-.9.9h-1.7c-.5 0-.9-.4-.9-.9v-.72a11 11 0 0 1-2.9 0v.72c0 .5-.4.9-.9.9H6.8c-.5 0-.9-.4-.9-.9v-1.73c-1.94-1.18-3.15-3-3.15-5.02Z'
const D_PORCO_FRESTA = 'M8.5 4.75h3'
export const PorquinhoContorno = (p: P) => (
  <svg {...baseContorno} {...p}>
    <path d={D_PORCO_CORPO} />
    <path d={D_PORCO_FRESTA} />
    <path d="M6.75 12.25h.01" />
  </svg>
)
export const PorquinhoPreenchido = (p: P) => (
  <svg {...basePreenchido} {...p}>
    <path d="M8.5 4a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" />
    <path
      fillRule="evenodd"
      d="M10.25 6c-4.5 0-8.25 2.62-8.25 6.5 0 2.1 1.14 3.95 2.9 5.2v1.55c0 .9.74 1.65 1.65 1.65h1.7c.9 0 1.65-.75 1.65-1.65v-.02a12 12 0 0 0 1.4 0v.02c0 .9.75 1.65 1.65 1.65h1.7c.91 0 1.65-.75 1.65-1.65v-1.22c.7-.5 1.3-1.1 1.72-1.78h1.13c.91 0 1.65-.74 1.65-1.65v-2.2c0-.91-.74-1.65-1.65-1.65h-.8a6.3 6.3 0 0 0-2.02-3.1l.3-1.8c.19-1.18-1.13-2-2.1-1.3l-1.79 1.28A11.6 11.6 0 0 0 10.25 6ZM6.75 11.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"
      clipRule="evenodd"
    />
  </svg>
)

/* ----------------------------------------------------------------- academia
   Halter: barra central, discos e travas. */
const D_HALTER_BARRA = 'M7.75 12h8.5'
const D_HALTER_DISCO_E = 'M5.5 8.75h2v6.5h-2z'
const D_HALTER_DISCO_D = 'M16.5 8.75h2v6.5h-2z'
const D_HALTER_TRAVA_E = 'M3.25 10.25v3.5'
const D_HALTER_TRAVA_D = 'M20.75 10.25v3.5'
export const HalterContorno = (p: P) => (
  <svg {...baseContorno} {...p}>
    <path d={D_HALTER_TRAVA_E} />
    <path d={D_HALTER_DISCO_E} />
    <path d={D_HALTER_BARRA} />
    <path d={D_HALTER_DISCO_D} />
    <path d={D_HALTER_TRAVA_D} />
  </svg>
)
export const HalterPreenchido = (p: P) => (
  <svg {...basePreenchido} {...p}>
    <path d="M3.25 9.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75ZM20.75 9.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75ZM5.5 8a.75.75 0 0 0-.75.75v6.5c0 .41.34.75.75.75h2a.75.75 0 0 0 .75-.75v-2.5h7v2.5c0 .41.34.75.75.75h2a.75.75 0 0 0 .75-.75v-6.5A.75.75 0 0 0 18.5 8h-2a.75.75 0 0 0-.75.75v2.5h-7v-2.5A.75.75 0 0 0 7.5 8h-2Z" />
  </svg>
)

/* -------------------------------------------------------------- alimentação
   Talher: garfo e faca. */
/* A faca: lâmina FECHADA (o contorno volta pela lateral reta) mais o cabo.
   A 1ª versão era só uma curva aberta e, renderizada, lia como um
   parêntese ao lado do garfo — conferido na prévia antes de entregar. */
const D_FACA_LAMINA = 'M16.75 3.1c2.4 1.95 3.6 4.5 3.6 6.9 0 1.9-1.35 3.2-3.6 3.45z'
const D_FACA_CABO = 'M16.75 13.45v7.3'
export const TalherContorno = (p: P) => (
  <svg {...baseContorno} {...p}>
    <path d="M6.75 3.25v4.5a2.25 2.25 0 0 0 4.5 0v-4.5" />
    <path d="M9 8v12.75" />
    <path d={D_FACA_LAMINA} />
    <path d={D_FACA_CABO} />
  </svg>
)
export const TalherPreenchido = (p: P) => (
  <svg {...basePreenchido} {...p}>
    <path d="M7.5 2.5a.75.75 0 0 0-1.5 0v5.25a3 3 0 0 0 2.25 2.9v10.1a.75.75 0 0 0 1.5 0V10.65a3 3 0 0 0 2.25-2.9V2.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-.75 1.3V2.5a.75.75 0 0 0-1.5 0v6.55a1.5 1.5 0 0 1-.75-1.3V2.5Z" />
    <path d="M16.3 2.51a.75.75 0 0 0-1.05.69v17.55a.75.75 0 0 0 1.5 0v-6.6c2.55-.38 4.1-2 4.1-4.15 0-2.72-1.4-5.48-4.07-7.44a.75.75 0 0 0-.48-.05Z" />
  </svg>
)

/* ------------------------------------------------------------- transporte
   Carro de passeio (o Heroicons só tem caminhão). */
export const CarroContorno = (p: P) => (
  <svg {...baseContorno} {...p}>
    <path d="M3.25 16.5v2.25c0 .41.34.75.75.75h1.5a.75.75 0 0 0 .75-.75V16.5M17.75 16.5v2.25c0 .41.34.75.75.75H20a.75.75 0 0 0 .75-.75V16.5" />
    <path d="M4.75 16.5h14.5a1.5 1.5 0 0 0 1.5-1.5v-2.25a1.5 1.5 0 0 0-1.1-1.45l-1.4-.4-1.86-4.02a2 2 0 0 0-1.81-1.13H8.42a2 2 0 0 0-1.81 1.13L4.75 10.9l-1.4.4a1.5 1.5 0 0 0-1.1 1.45V15a1.5 1.5 0 0 0 1.5 1.5Z" />
    <path d="M5 11h14" />
    <path d="M6.75 13.75h.01M17.25 13.75h.01" />
  </svg>
)
export const CarroPreenchido = (p: P) => (
  <svg {...basePreenchido} {...p}>
    <path
      fillRule="evenodd"
      d="M8.42 4.5a2.75 2.75 0 0 0-2.49 1.56L4.2 10.33l-1.05.3A2.25 2.25 0 0 0 1.5 12.8V15a2.25 2.25 0 0 0 1 1.87v1.88c0 .96.79 1.75 1.75 1.75h1.5c.96 0 1.75-.79 1.75-1.75V17.25h9v1.5c0 .96.79 1.75 1.75 1.75H20c.96 0 1.75-.79 1.75-1.75v-1.88a2.25 2.25 0 0 0 1-1.87V12.8a2.25 2.25 0 0 0-1.65-2.17l-1.05-.3-1.73-4.27a2.75 2.75 0 0 0-2.49-1.56H8.42ZM6 10.25h12l-1.4-3.44a1.25 1.25 0 0 0-1.14-.81H8.42c-.5 0-.95.3-1.14.81L6 10.25Zm.75 2.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm10.5 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
      clipRule="evenodd"
    />
  </svg>
)
