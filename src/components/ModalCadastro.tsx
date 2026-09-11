/* Popup padrão de CADASTRO (11/09/2026, pedido do Rafael: "Nos cadastros
   todos do sistema, deve abrir popup e nunca na mesma tela").

   Até aqui cada tela de cadastro editava no meio da lista: clicar em "Editar"
   trocava a linha por um formulário, e "+ Incluir" abria o formulário embaixo
   de tudo. Isso empurrava a lista inteira pra baixo, fazia perder o lugar onde
   se estava e, numa lista longa, escondia o próprio formulário.

   Esta peça é só a moldura — mesmo `.modal-fundo`/`.modal-conteudo` que o
   formulário de lançamento e as folhas de escolha já usam, então o
   comportamento (fundo escurecido, clique fora fecha, rolagem interna, altura
   máxima, margem em tela baixa) é o mesmo do resto do app, sem CSS novo.

   Quem usa: Categorias e Grupos, Contas e carteiras, e a edição de
   Aceitável/Meta chamada de dentro do Planejamento. */
import type { ReactNode } from 'react'

export default function ModalCadastro({
  titulo,
  children,
  onFechar,
  onSalvar,
  rotuloSalvar = 'Salvar',
  salvarDesabilitado,
  aviso,
}: {
  titulo: string
  children: ReactNode
  onFechar: () => void
  onSalvar: () => void
  rotuloSalvar?: string
  salvarDesabilitado?: boolean
  /* Linha de erro/alerta acima dos botões — é onde a regra de vínculo
     (categoria de receita × grupo de saída) aparece, por exemplo. */
  aviso?: ReactNode
}) {
  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
        <div className="linha" style={{ border: 'none', padding: 0, marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>{titulo}</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: 0 }}
          >
            ✕
          </button>
        </div>
        {children}
        {aviso && (
          <p className="valor-neg" style={{ marginTop: 12, marginBottom: 0, fontSize: 12.5 }}>
            {aviso}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button type="button" className="primario" style={{ marginTop: 0, flex: 1 }} disabled={salvarDesabilitado} onClick={onSalvar}>
            {rotuloSalvar}
          </button>
          <button
            type="button"
            style={{ marginTop: 0, background: 'none', border: '1px solid var(--borda)', borderRadius: 10, padding: '12px', cursor: 'pointer' }}
            onClick={onFechar}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
