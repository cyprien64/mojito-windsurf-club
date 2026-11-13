import { ShieldAlert } from 'lucide-react';

export function SafetyNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border border-mint-200 bg-mint-50/70 ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'} text-ink-800`}>
      <ShieldAlert className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} mt-0.5 shrink-0 text-mint-700`} />
      <p>
        <strong>Aide à la décision, pas une garantie de sécurité.</strong> Les notes et recommandations sont calculées automatiquement à partir de
        prévisions de modèles météo. Vérifiez toujours les conditions réelles sur place, les restrictions locales et les vigilances
        Météo-France avant de naviguer.
      </p>
    </div>
  );
}
