/* Escolha de CONTA com o selo da instituição — no lugar do `<select>` nativo
   "Pago com" (build 099, item E-02/V-06 do relatório da tela de lançamento).

   Duas caras para a MESMA folha:
   - `ChipConta`  — o chip "no Bradesco ✎" que fica abaixo do valor, na linha
                    de chips (Data · Conta · Já saiu). Com UMA conta só
                    cadastrada o chip nem aparece: não há escolha a fazer.
   - `CampoConta` — o campo com cara de input (`.campo-como-botao`), usado na
                    transferência (origem/destino) e no pagamento de fatura,
                    onde a conta é um campo de verdade, não um "de sempre".

   A folha é a `.folha-escolha` do app (build 023) — nunca um segundo desenho. */
import { useState } from 'react'
import type { Conta } from '../db'
import SeloInstituicao from './SeloInstituicao'

function sufixoTipo(c: Conta) {
  return c.tipo === 'cartao' ? 'cartão' : c.tipo === 'cofre' ? 'cofrinho' : 'conta'
}

function Folha({
  titulo, contas, valor, onEscolher, onFechar, testid,
}: {
  titulo: string
  contas: Conta[]
  valor: number | ''
  onEscolher: (id: number) => void
  onFechar: () => void
  testid?: string
}) {
  return (
    <div className="folha-escolha" role="dialog" aria-label={titulo} data-testid={testid}>
      <div className="folha-escolha-fundo" onClick={onFechar} />
      <div className="folha-escolha-painel">
        <div className="folha-escolha-topo">
          <strong>{titulo}</strong>
          <button type="button" onClick={onFechar} aria-label="Fechar">✕</button>
        </div>
        <div className="folha-escolha-lista">
          {contas.length === 0 && <p className="texto-fraco">Nenhuma conta cadastrada.</p>}
          {contas.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`folha-escolha-item ${c.id === valor ? 'ativo' : ''}`}
              onClick={() => { onEscolher(c.id!); onFechar() }}
              data-testid={testid ? `${testid}-${c.id}` : undefined}
            >
              <span className="folha-escolha-item-icone">
                <SeloInstituicao instituicao={c.iconeInstituicao} cor={c.iconeCor} imagemUri={c.iconeImagemUri} nome={c.nome} tamanho={24} />
              </span>
              <span className="folha-escolha-item-nome">
                {c.nome}
                <span className="folha-escolha-item-sub">{sufixoTipo(c)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** O chip "no Bradesco ✎" da linha abaixo do valor. */
export function ChipConta({
  contas, valor, onEscolher, prefixo = 'no', comErro, id, testid = 'chip-conta',
}: {
  contas: Conta[]
  valor: number | ''
  onEscolher: (id: number) => void
  /** "no" (saída/entrada) — o texto fica "no Bradesco". */
  prefixo?: string
  comErro?: boolean
  id?: string
  testid?: string
}) {
  const [aberta, setAberta] = useState(false)
  const atual = contas.find((c) => c.id === valor)
  return (
    <>
      <button
        type="button"
        id={id}
        className={`dl-chip ${atual ? '' : 'dl-chip-vazio'} ${comErro ? 'campo-com-erro' : ''}`}
        onClick={() => setAberta(true)}
        data-testid={testid}
        title="Trocar a conta"
      >
        {atual ? (
          <>
            <SeloInstituicao instituicao={atual.iconeInstituicao} cor={atual.iconeCor} imagemUri={atual.iconeImagemUri} nome={atual.nome} tamanho={16} />
            <span>{prefixo} {atual.nome}</span>
          </>
        ) : (
          <span>escolher a conta</span>
        )}
        <span className="dl-chip-editar" aria-hidden="true">✎</span>
      </button>
      {aberta && (
        <Folha titulo="Pago com" contas={contas} valor={valor} onEscolher={onEscolher} onFechar={() => setAberta(false)} testid={`${testid}-folha`} />
      )}
    </>
  )
}

/** O campo com cara de input — transferência e pagamento de fatura. */
export function CampoConta({
  contas, valor, onEscolher, id, comErro, titulo, rotuloVazio = 'Escolha…', testid,
}: {
  contas: Conta[]
  valor: number | ''
  onEscolher: (id: number) => void
  id?: string
  comErro?: boolean
  titulo: string
  rotuloVazio?: string
  testid?: string
}) {
  const [aberta, setAberta] = useState(false)
  const atual = contas.find((c) => c.id === valor)
  return (
    <>
      <button
        type="button"
        id={id}
        className={`campo-como-botao ${comErro ? 'campo-com-erro' : ''}`}
        onClick={() => setAberta(true)}
        data-testid={testid}
      >
        {atual ? (
          <>
            <span className="campo-como-botao-icone">
              <SeloInstituicao instituicao={atual.iconeInstituicao} cor={atual.iconeCor} imagemUri={atual.iconeImagemUri} nome={atual.nome} tamanho={22} />
            </span>
            <span className="campo-como-botao-texto">{atual.nome}</span>
            <span className="campo-como-botao-sub">{sufixoTipo(atual)}</span>
          </>
        ) : (
          <span className="campo-como-botao-texto texto-fraco">{rotuloVazio}</span>
        )}
        <span className="campo-como-botao-seta">›</span>
      </button>
      {aberta && (
        <Folha titulo={titulo} contas={contas} valor={valor} onEscolher={onEscolher} onFechar={() => setAberta(false)} testid={testid ? `${testid}-folha` : undefined} />
      )}
    </>
  )
}
