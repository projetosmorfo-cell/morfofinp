package app.morfo.morfofinp.notificacao;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

/**
 * Ponte JS ↔ nativo da leitura de notificações bancárias. O lado JS está em
 * `src/notificacaoBancaria.ts` (registerPlugin('NotificacaoBancaria')).
 *
 * Métodos:
 *  - verificarAcesso()            → { concedido }  "Acesso a notificações" ligado pro app?
 *  - abrirConfiguracaoAcesso()    → abre a tela do Android onde a pessoa liga isso
 *  - solicitarPermissaoAviso()    → pede POST_NOTIFICATIONS (Android 13+) pro aviso "toque pra confirmar"
 *  - obterPendentes()             → { itens: [...] } tudo que o serviço capturou e o app ainda não pegou
 *  - confirmarRecebidas({ids})    → apaga da fila nativa (chamar SÓ depois de gravar no Dexie)
 *  - definirPacotesIgnorados({pacotes}) / obterPacotesIgnorados()
 *  - evento "notificacaoRecebida" → disparado na hora, quando o app está aberto
 */
@CapacitorPlugin(
    name = "NotificacaoBancaria",
    permissions = {
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = NotificacaoBancariaPlugin.ALIAS_AVISO)
    }
)
public class NotificacaoBancariaPlugin extends Plugin {

    static final String ALIAS_AVISO = "aviso";
    private static volatile NotificacaoBancariaPlugin instancia;

    @Override
    public void load() {
        instancia = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instancia == this) instancia = null;
        super.handleOnDestroy();
    }

    /** Chamado pelo serviço (mesmo processo) — só faz algo se o app estiver aberto. */
    static void avisarNova(JSONObject item) {
        NotificacaoBancariaPlugin p = instancia;
        if (p == null) return;
        try {
            p.notifyListeners("notificacaoRecebida", JSObject.fromJSONObject(item), true);
        } catch (JSONException e) {
            // ignora — o item continua na fila, o JS pega via obterPendentes
        }
    }

    @PluginMethod
    public void verificarAcesso(PluginCall call) {
        Set<String> habilitados = NotificationManagerCompat.getEnabledListenerPackages(getContext());
        JSObject r = new JSObject();
        r.put("concedido", habilitados.contains(getContext().getPackageName()));
        call.resolve(r);
    }

    @PluginMethod
    public void abrirConfiguracaoAcesso(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    @PluginMethod
    public void solicitarPermissaoAviso(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject r = new JSObject();
            r.put("concedida", true); // antes do Android 13 não existe essa permissão
            call.resolve(r);
            return;
        }
        if (getPermissionState(ALIAS_AVISO) == PermissionState.GRANTED) {
            JSObject r = new JSObject();
            r.put("concedida", true);
            call.resolve(r);
            return;
        }
        requestPermissionForAlias(ALIAS_AVISO, call, "permissaoAvisoCallback");
    }

    @PermissionCallback
    private void permissaoAvisoCallback(PluginCall call) {
        JSObject r = new JSObject();
        r.put("concedida", getPermissionState(ALIAS_AVISO) == PermissionState.GRANTED);
        call.resolve(r);
    }

    @PluginMethod
    public void obterPendentes(PluginCall call) {
        JSONArray fila = FilaNotificacoes.listar(getContext());
        JSObject r = new JSObject();
        try {
            // JSArray(Object) só aceita array Java — por isso passa pelo texto JSON.
            r.put("itens", new JSArray(fila.toString()));
        } catch (JSONException e) {
            r.put("itens", new JSArray());
        }
        call.resolve(r);
    }

    @PluginMethod
    public void confirmarRecebidas(PluginCall call) {
        JSArray ids = call.getArray("ids");
        Set<String> set = new HashSet<>();
        if (ids != null) {
            for (int i = 0; i < ids.length(); i++) {
                String id = ids.optString(i, null);
                if (id != null) set.add(id);
            }
        }
        FilaNotificacoes.remover(getContext(), set);
        call.resolve();
    }

    @PluginMethod
    public void definirPacotesIgnorados(PluginCall call) {
        JSArray pacotes = call.getArray("pacotes");
        Set<String> set = new HashSet<>();
        if (pacotes != null) {
            for (int i = 0; i < pacotes.length(); i++) {
                String p = pacotes.optString(i, null);
                if (p != null) set.add(p);
            }
        }
        FilaNotificacoes.definirPacotesIgnorados(getContext(), set);
        call.resolve();
    }

    @PluginMethod
    public void obterPacotesIgnorados(PluginCall call) {
        JSObject r = new JSObject();
        r.put("pacotes", new JSArray(FilaNotificacoes.pacotesIgnorados(getContext())));
        call.resolve(r);
    }
}
