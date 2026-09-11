// Carimbo de versão/build (G52) — fonte única de verdade.
//
// BUG REAL corrigido em 08/09/2026: o rodapé do Login (`LoginView.tsx`)
// mostrava o texto FIXO "v0.1 · build 001" desde a Decisão 27 (08/09/2026),
// nunca atualizado em nenhuma entrega seguinte — Rafael reportou "já
// estamos na dois e lá está um ainda". Causa raiz: o número nunca foi lido
// de lugar nenhum, era uma string digitada direto no JSX. Corrigido criando
// este módulo — TODA entrega numerada deste produto (build local `.html`
// OU zip de código-fonte pro GitHub, mesmo contador desde a Decisão 17)
// precisa incrementar `BUILD_NUMBER` aqui ANTES de gerar o build, e o
// rodapé do Login lê daqui, nunca mais um número digitado à mão na tela.
//
// Regra permanente: 1 contador só pros dois tipos de entrega (zip e html)
// — depois desta correção, "MorfoFinP-build-NNN.zip" e o carimbo "build
// NNN" no rodapé do app SEMPRE precisam bater. Esquecer de incrementar
// aqui antes de entregar é exatamente o bug que o Rafael pediu pra nunca
// mais acontecer.
export const VERSAO = '0.1'
export const BUILD_NUMBER = 35
export const CARIMBO_BUILD = `v${VERSAO} · build ${String(BUILD_NUMBER).padStart(3, '0')}`
