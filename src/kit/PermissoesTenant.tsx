import { useState } from 'react'
import { useTenantN1, atualizarTenantN0, TENANT_N1_ID, FUNCOES_PERFIL_N1, perfisPadraoN1 } from './kitPlatform'
import { PerfisAcessoContent } from './PerfisAcesso'

// N1 → engrenagem → "Permissões" (10/09/2026, Decisão 54 Parte B) — Kit
// `PermissoesTenantView` (L4322-L4331 do arquivo autoritativo de 7818
// linhas): `PerfisAcessoContent` com `FUNCOES_PERFIL_N1`/`t0.perfisAcesso`/
// `t0.users`. Mesmo componente compartilhado que o N0 usa
// (`PerfisAcesso.tsx`) — aqui em modo claro (`dark` omitido), fiel ao Kit
// (o Kit também usa `dark` só na variante N0/`DevApp`).
export default function PermissoesTenant({ aoVoltar }: { aoVoltar: () => void }) {
  const tenant = useTenantN1()
  const perfis = tenant?.perfisAcesso ?? perfisPadraoN1()
  const users = tenant?.users ?? []
  const [msg, setMsg] = useState('')
  function notify(m: string) { setMsg(m); setTimeout(() => setMsg(''), 2000) }
  return (
    <>
      <div className="cabecalho-fixo">
        <button type="button" className="botao-voltar-config" onClick={aoVoltar}>‹ Voltar</button>
        <h1>Permissões</h1>
      </div>
      {msg && <p style={{ color: 'var(--azul)', fontSize: 13, fontWeight: 700 }}>{msg}</p>}
      <PerfisAcessoContent
        funcs={FUNCOES_PERFIL_N1}
        perfis={perfis}
        users={users}
        notify={notify}
        salvarPerfis={(novos) => void atualizarTenantN0(TENANT_N1_ID, (t) => ({ ...t, perfisAcesso: novos }))}
        migrarUsuarios={(deId, paraId) => void atualizarTenantN0(TENANT_N1_ID, (t) => ({ ...t, users: t.users.map((u) => ((u.perfilId || 'admin') === deId ? { ...u, perfilId: paraId } : u)) }))}
      />
    </>
  )
}
