/* oxlint-disable react-hooks/rules-of-hooks -- `usarAvisoPermissoes` É um hook de verdade
   (chamado só no corpo de componente, sempre na mesma ordem); a regra só não
   reconhece porque o projeto nomeia em português ("usar…" no lugar de "use…"),
   como todo o resto do código. Renomear pra inglês seria quebrar a convenção do
   projeto por causa de uma heurística de nome. */
/* As DUAS permissões da notificação bancária, sempre com o mesmo peso
   (12/09/2026, pedido do Rafael: "tem 2 permissões pra serem dadas pelo
   usuário e a segunda é muito discreta, acaba passando despercebida, devem
   ser 2 botões; além disso quero que ao abrir o app apareça um popup com
   esses dados e os 2 botões, enquanto não forem fornecidas as permissões —
   com a opção de lembrar mais tarde ou não mostrar novamente").

   São permissões diferentes e independentes:
   1. LER as notificações do banco (tela do Android "Acesso a notificações").
      Sem ela o app não enxerga movimentação nenhuma.
   2. AVISAR na tela ("movimentação detectada", `POST_NOTIFICATIONS`,
      Android 13+). Sem ela o app ainda lê, mas você só descobre ao abrir.

   O mesmo bloco (`BotoesPermissaoNotificacao`) é usado na tela de
   Notificações bancárias e dentro do popup — um lugar só pra manter texto,
   ordem e estado iguais nos dois. */
import { useCallback, useEffect, useState } from 'react'
import {
  ehNativo,
  acessoConcedido,
  avisoConcedido,
  abrirConfiguracaoAcesso,
  solicitarPermissaoAviso,
} from '../notificacaoBancaria'
import { salvarConfiguracaoIcones } from '../configuracaoIcones'

export type EstadoPermissoes = { acesso: boolean; aviso: boolean }

/** Lê as duas permissões de uma vez (no navegador devolve as duas como falsas). */
export async function lerPermissoes(): Promise<EstadoPermissoes> {
  if (!ehNativo()) return { acesso: false, aviso: false }
  const [acesso, aviso] = await Promise.all([acessoConcedido(), avisoConcedido()])
  return { acesso, aviso }
}

function LinhaPermissao({
  titulo,
  explicacao,
  concedida,
  rotulo,
  onClick,
}: {
  titulo: string
  explicacao: string
  concedida: boolean
  rotulo: string
  onClick: () => void
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontWeight: 700 }}>{titulo}</span>
        <span className={concedida ? 'valor-pos' : 'valor-neg'} style={{ fontSize: 13 }}>
          {concedida ? 'ligado' : 'desligado'}
        </span>
      </div>
      <p className="texto-fraco" style={{ fontSize: 13, margin: '4px 0 8px' }}>{explicacao}</p>
      {/* Os dois são botão azul (`.primario`) do mesmo tamanho: a 2ª permissão
          era um botão neutro e passava despercebida. Concedida, o botão vira
          confirmação e sai do caminho (desabilitado). */}
      <button
        type="button"
        className="primario botao-compacto"
        style={{ opacity: concedida ? 0.5 : 1 }}
        disabled={concedida}
        onClick={onClick}
      >
        {concedida ? 'Já liberado' : rotulo}
      </button>
    </div>
  )
}

export function BotoesPermissaoNotificacao({
  estado,
  aoMudar,
}: {
  estado: EstadoPermissoes
  aoMudar: (novo: EstadoPermissoes) => void
}) {
  return (
    <>
      <LinhaPermissao
        titulo="Ler as notificações do banco"
        explicacao='Abre a lista do Android: encontre "MorfoFinP" e ligue o acesso. Sem isso o app não enxerga nenhuma movimentação.'
        concedida={estado.acesso}
        rotulo="Liberar a leitura no Android"
        onClick={() => { void abrirConfiguracaoAcesso() }}
      />
      <LinhaPermissao
        titulo='Avisar "movimentação detectada"'
        explicacao="Permite o app te avisar na hora que detectar uma movimentação. Sem isso ela só aparece quando você abrir o app."
        concedida={estado.aviso}
        rotulo="Liberar o aviso na tela"
        onClick={async () => {
          const ok = await solicitarPermissaoAviso()
          aoMudar({ ...estado, aviso: ok })
        }}
      />
    </>
  )
}

/* O popup de abertura. Quem decide se ele aparece é `usarAvisoPermissoes()`
   (abaixo) — aqui só fica o desenho e as duas saídas. */
export function PopupPermissoesNotificacao({
  estado,
  aoMudar,
  aoAdiar,
  aoNuncaMais,
}: {
  estado: EstadoPermissoes
  aoMudar: (novo: EstadoPermissoes) => void
  aoAdiar: () => void
  aoNuncaMais: () => void
}) {
  return (
    <div className="modal-fundo" onClick={aoAdiar}>
      <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>Notificações Bancárias</h2>
        <p className="texto-fraco" style={{ fontSize: 13, marginTop: 0 }}>
          O app lê as notificações do banco/cartão no seu celular e te avisa. Nada vira lançamento sozinho —
          você confirma ou edita cada uma antes de gravar. Faltam estas permissões:
        </p>
        <BotoesPermissaoNotificacao estado={estado} aoMudar={aoMudar} />
        <div className="notif-acoes" style={{ marginTop: 4 }}>
          <button type="button" className="secundario" onClick={aoAdiar}>
            Lembrar mais tarde
          </button>
          <button type="button" className="secundario" onClick={aoNuncaMais}>
            Não mostrar novamente
          </button>
        </div>
      </div>
    </div>
  )
}

/* Decide se o popup aparece nesta abertura do app e devolve o que a tela
   precisa pra desenhá-lo. Regras:
   - só no app instalado (no navegador não existe permissão pra pedir);
   - só enquanto FALTA alguma das duas;
   - "Lembrar mais tarde" some pelo resto do dia (volta na abertura seguinte,
     em outro dia); "Não mostrar novamente" some pra sempre — até faltar
     permissão de novo depois de ter sido concedida? Não: a marca é
     permanente, é isso que "novamente" quer dizer. */
export function usarAvisoPermissoes(
  /* `undefined` = a configuração AINDA NÃO CHEGOU do banco; `null` = chegou e
     não existe registro. Build 090, defeito real relatado pelo Rafael:
     "mesmo colocando pra lembrar mais tarde, se fecho o app e abro, a tela
     tenta abrir, pisca e fecha". Era isto: na primeira passada `config` vinha
     `undefined` (carregando), a regra não via o adiamento, ABRIA — e na
     passada seguinte, com a configuração em mãos, FECHAVA. Agora, enquanto
     não se sabe o que está gravado, não se decide nada. */
  config: { permissoesAdiadasEm?: string; permissoesNuncaMostrar?: boolean } | null | undefined,
) {
  const [estado, setEstado] = useState<EstadoPermissoes>({ acesso: false, aviso: false })
  const [aberto, setAberto] = useState(false)
  const configPronta = config !== undefined

  const conferir = useCallback(async () => {
    if (!ehNativo()) return
    if (!configPronta) return
    const atual = await lerPermissoes()
    setEstado(atual)
    const falta = !atual.acesso || !atual.aviso
    const hoje = new Date().toISOString().slice(0, 10)
    const adiadoHoje = (config?.permissoesAdiadasEm ?? '').slice(0, 10) === hoje
    setAberto(falta && !config?.permissoesNuncaMostrar && !adiadoHoje)
  }, [configPronta, config?.permissoesAdiadasEm, config?.permissoesNuncaMostrar])

  useEffect(() => { void conferir() }, [conferir])

  // Concedeu tudo com o popup aberto: ele se fecha sozinho.
  useEffect(() => { if (estado.acesso && estado.aviso) setAberto(false) }, [estado])

  return {
    aberto,
    estado,
    setEstado,
    adiar: () => {
      setAberto(false)
      void salvarConfiguracaoIcones({ permissoesAdiadasEm: new Date().toISOString() })
    },
    nuncaMais: () => {
      setAberto(false)
      void salvarConfiguracaoIcones({ permissoesNuncaMostrar: true })
    },
  }
}
