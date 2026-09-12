/* Campo de escolha com UMA LINHA DE EXPLICAÇÃO por opção (12/09/2026, pedido
   do Rafael, em dois campos ao mesmo tempo):

     "no cadastro de Categorias o campo 'Natureza' pode ser confuso pro
      usuário, ele precisa saber o impacto nos cálculos, então deve ter uma
      breve explicação e uma linha abaixo de cada item dentro do campo de
      seleção" — e, logo depois, "campo Tipo [de conta] também deve ter
      explicação no mesmo sentido".

   Por que não é um `<select>`: o `<option>` nativo é texto de uma linha só —
   não aceita uma 2ª linha explicando, nem estilo/tema. É a mesma regra que
   já vale neste projeto desde a build 023 ("`<select>` nunca mostra ícone nem
   respeita o tema; pedido desse tipo vira `.campo-como-botao` + folha
   `.folha-escolha`"), e esta peça é justamente a versão reutilizável disso —
   mesma moldura de folha que o seletor de categoria e o de instituição já
   usam, sem CSS novo. */
import { useState } from 'react'

export interface OpcaoExplicada<T extends string> {
  valor: T
  rotulo: string
  explicacao: string
}

export default function SeletorComExplicacao<T extends string>({
  id,
  titulo,
  valor,
  opcoes,
  onEscolher,
}: {
  id?: string
  titulo: string
  valor: T
  opcoes: OpcaoExplicada<T>[]
  onEscolher: (v: T) => void
}) {
  const [aberto, setAberto] = useState(false)
  const atual = opcoes.find((o) => o.valor === valor)

  return (
    <>
      <button type="button" id={id} className="campo-como-botao" onClick={() => setAberto(true)}>
        <span className="campo-como-botao-texto">
          <span style={{ display: 'block' }}>{atual?.rotulo ?? 'Escolher…'}</span>
          {atual && (
            <span className="texto-fraco" style={{ display: 'block', fontSize: 11.5, lineHeight: 1.35 }}>
              {atual.explicacao}
            </span>
          )}
        </span>
        <span className="campo-como-botao-seta">›</span>
      </button>

      {aberto && (
        <div className="folha-escolha" role="dialog" aria-label={titulo}>
          <div className="folha-escolha-fundo" onClick={() => setAberto(false)} />
          <div className="folha-escolha-painel">
            <div className="folha-escolha-topo">
              <strong>{titulo}</strong>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar">✕</button>
            </div>
            <div style={{ overflowY: 'auto' }}>
              {opcoes.map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  onClick={() => { onEscolher(o.valor); setAberto(false) }}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    marginTop: 0,
                    marginBottom: 8,
                    padding: '10px 12px',
                    borderRadius: 10,
                    border: `1px solid ${o.valor === valor ? 'var(--azul)' : 'var(--borda)'}`,
                    background: o.valor === valor ? 'rgba(59,130,246,0.12)' : 'var(--bg)',
                    color: 'var(--texto)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{o.rotulo}</span>
                  <span className="texto-fraco" style={{ display: 'block', fontSize: 12, lineHeight: 1.4, marginTop: 2 }}>
                    {o.explicacao}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
