package app.morfo.morfofinp.notificacao;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

/**
 * Fila persistente de notificações capturadas, guardada em SharedPreferences.
 *
 * Por que persistir e não só "avisar o JS": o serviço de leitura
 * (NotificacaoListenerService) é iniciado pelo Android e roda mesmo com o app
 * FECHADO — nesse momento não existe WebView nem JavaScript pra receber nada.
 * Então tudo que é capturado entra aqui primeiro; quando o app abre, o lado JS
 * chama `obterPendentes` e só apaga daqui (`confirmarRecebidas`) depois de já
 * ter gravado no Dexie. Se o app fechar no meio, nada se perde.
 *
 * Também guarda a lista de pacotes (apps) que o usuário mandou ignorar, pra o
 * serviço nem enfileirar nem avisar sobre eles.
 */
final class FilaNotificacoes {
    private static final String PREFS = "morfofinp_notificacao_bancaria";
    private static final String CHAVE_FILA = "fila";
    private static final String CHAVE_IGNORADOS = "pacotesIgnorados";
    // Teto de segurança: nunca acumula indefinidamente se a pessoa ficar meses
    // sem abrir o app — os mais antigos saem primeiro.
    private static final int MAXIMO = 200;

    private FilaNotificacoes() {}

    private static SharedPreferences prefs(Context ctx) {
        return ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static synchronized JSONArray listar(Context ctx) {
        try {
            return new JSONArray(prefs(ctx).getString(CHAVE_FILA, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }

    static synchronized void adicionar(Context ctx, JSONObject item) {
        JSONArray atual = listar(ctx);
        JSONArray nova = new JSONArray();
        int inicio = Math.max(0, atual.length() - (MAXIMO - 1));
        for (int i = inicio; i < atual.length(); i++) {
            nova.put(atual.opt(i));
        }
        nova.put(item);
        prefs(ctx).edit().putString(CHAVE_FILA, nova.toString()).apply();
    }

    static synchronized void remover(Context ctx, Set<String> ids) {
        JSONArray atual = listar(ctx);
        JSONArray nova = new JSONArray();
        for (int i = 0; i < atual.length(); i++) {
            JSONObject o = atual.optJSONObject(i);
            if (o == null) continue;
            if (!ids.contains(o.optString("id"))) nova.put(o);
        }
        prefs(ctx).edit().putString(CHAVE_FILA, nova.toString()).apply();
    }

    static synchronized Set<String> pacotesIgnorados(Context ctx) {
        Set<String> salvo = prefs(ctx).getStringSet(CHAVE_IGNORADOS, null);
        return salvo == null ? new HashSet<>() : new HashSet<>(salvo);
    }

    static synchronized void definirPacotesIgnorados(Context ctx, Set<String> pacotes) {
        prefs(ctx).edit().putStringSet(CHAVE_IGNORADOS, new HashSet<>(pacotes)).apply();
    }
}
