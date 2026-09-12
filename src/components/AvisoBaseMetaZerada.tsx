import { EXPLICACAO_BASE_META } from '../baseMeta'

/* Aviso de base de meta zerada (12/09/2026, build 053).

   Nasceu de um bug real: sem nenhuma categoria marcada como "receita fixa", a
   base das metas é R$ 0,00 — e daí toda meta de grupo vira R$ 0,00, o donut
   desenha contra zero e a linha de sobra/falta do card do grupo desaparece.
   O app fazia tudo isso **em silêncio**: as telas simplesmente mostravam zero,
   sem dizer que faltava um cadastro.

   A migração (`migrarReceitaFixa`) cobre quem vinha de uma base antiga, mas
   não cobre quem desmarcou tudo de propósito nem quem tem a renda com outro
   nome. Por isso o aviso: quando a base é zero, a tela DIZ o que falta e onde
   resolver, em vez de mostrar um zero sem explicação. */
export default function AvisoBaseMetaZerada({ aoAbrirCategorias }: { aoAbrirCategorias?: () => void }) {
  return (
    <div className="tarja-inativa" data-testid="aviso-base-zerada" style={{ marginBottom: 10 }}>
      <strong>As metas estão em R$ 0,00.</strong> Nenhuma categoria está marcada como receita fixa, e {EXPLICACAO_BASE_META.charAt(0).toLowerCase() + EXPLICACAO_BASE_META.slice(1)}
      {aoAbrirCategorias && (
        <>
          {' '}
          <button
            type="button"
            data-testid="aviso-base-zerada-abrir"
            onClick={aoAbrirCategorias}
            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--azul)', font: 'inherit', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
          >
            Marcar a minha renda fixa
          </button>
        </>
      )}
    </div>
  )
}
