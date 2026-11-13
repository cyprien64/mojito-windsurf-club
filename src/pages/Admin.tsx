import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Check, Download, RotateCcw, Save, Upload } from 'lucide-react';
import { SPOTS, SPOT_BY_ID } from '../config/spots';
import { WEIGHT_LABELS, buildDefaultSettings } from '../config/scoring';
import { useApp } from '../context/AppContext';
import { WindRose } from '../components/WindRose';
import { SECTOR_RATING_META } from '../lib/scoring';
import { SECTOR_CODES, SECTOR_NAMES, sectorRange } from '../lib/wind';
import { exportSettings, normalizeSettings } from '../services/settings';
import { backendEnabled, loadAdminSession, logoutAdmin, publishSettings, sendLoginCode, verifyLoginCode, type AdminSession } from '../services/backend';
import type { ClubSettings, ScoringWeights, SectorRating, SpotWindConfig } from '../types';
import { calibrate, MIN_REPORTS } from '../lib/calibration';

function NumberField({ label, value, onChange, unit, step = 1 }: { label: string; value: number; onChange: (v: number) => void; unit?: string; step?: number }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1 flex items-center gap-1.5">
        <input type="number" step={step} className="input tabular" value={value} onChange={(e) => onChange(Number(e.target.value))} />
        {unit && <span className="text-xs font-bold text-ink-700">{unit}</span>}
      </div>
    </label>
  );
}

function validate(cfg: SpotWindConfig): string[] {
  const s = cfg.speed;
  const errs: string[] = [];
  if (!(s.minRideable <= s.idealMin && s.idealMin <= s.idealMax && s.idealMax <= s.maxRideable))
    errs.push('Les seuils de vent doivent être croissants : minimum ≤ idéal min ≤ idéal max ≤ excessif.');
  if (cfg.gusts.maxGustFactor < 1) errs.push('Le rapport rafale / vent moyen doit être ≥ 1.');
  if (cfg.gusts.maxGust < s.idealMax) errs.push('Le seuil de rafales est inférieur à la plage idéale : vérifiez la valeur.');
  return errs;
}

export function Admin() {
  const { settings, settingsSource, clubSettings, remoteSettings, reloadRemoteSettings, saveSettings, resetSettings, stations, reports } = useApp();
  const [draft, setDraft] = useState<ClubSettings>(() => structuredClone(settings));
  const [spotId, setSpotId] = useState(SPOTS[0].id);
  const [brush, setBrush] = useState<SectorRating>('ideal');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // si les réglages changent (ex. fichier du club chargé), on resynchronise tant que rien n'est modifié
  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    if (!dirtyRef.current) setDraft(structuredClone(settings));
  }, [settings]);

  const cfg = draft.spots[spotId];
  const setCfg = (patch: Partial<SpotWindConfig>) => setDraft((d) => ({ ...d, spots: { ...d.spots, [spotId]: { ...d.spots[spotId], ...patch } } }));
  const errors = SPOTS.flatMap((s) => validate(draft.spots[s.id]).map((e) => `${s.shortName} : ${e}`));
  const totalWeight = Object.values(draft.weights).reduce((a, b) => a + b, 0);
  const dangerCount = cfg.sectors.filter((s) => s === 'danger').length;

  const onSave = () => {
    if (errors.length) return;
    saveSettings(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const onExport = () => {
    const blob = new Blob([exportSettings(draft)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'club-settings.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onImport = async (file: File) => {
    try {
      const json = JSON.parse(await file.text());
      setDraft(normalizeSettings(json));
    } catch {
      alert('Fichier invalide : JSON attendu.');
    }
  };

  return (
    <div className="space-y-5 pb-20">
      <section>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Paramétrage du club</h1>
        <p className="max-w-3xl text-sm text-ink-700">
          Réservé aux administrateurs du Mojito Windsurf Club. Les réglages sont enregistrés dans ce navigateur. Pour les partager avec tous les membres, exportez-les
          puis remplacez le fichier <code className="rounded bg-mint-50 px-1">public/club-settings.json</code> du dépôt GitHub (voir README).
        </p>
        <p className="mt-1 text-xs font-bold text-mint-700">
          Réglages actifs :{' '}
          {settingsSource === 'local'
            ? 'personnalisés sur cet appareil'
            : settingsSource === 'remote'
              ? 'réglages du club publiés en ligne'
              : settingsSource === 'club'
                ? 'fichier du club (club-settings.json)'
                : 'valeurs par défaut du code'}
        </p>
      </section>

      <div className="rounded-xl border border-rate-mid/40 bg-orange-50 px-4 py-3 text-sm">
        <strong>Valeurs initiales à valider.</strong> Les orientations et seuils fournis par défaut sont une base de départ (vent dominant, axe du plan d’eau). Seuls
        les admins qui connaissent les spots peuvent définir les orientations <strong>dangereuses</strong> (vent offshore, zones interdites…). Seul l’offshore vers
        le large de Saint-Jean-de-Luz est pré-rempli, par prudence.
      </div>

      <AdminLogin draft={draft} onPublished={() => { reloadRemoteSettings(); resetSettings(); }} hasRemote={!!remoteSettings} />

      {/* Pondérations */}
      <section className="card card-pad">
        <h2 className="font-display text-lg font-extrabold">Pondérations de la note /100</h2>
        <p className="text-xs text-ink-700">Total actuel : {totalWeight} (les poids sont normalisés automatiquement).</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(WEIGHT_LABELS) as (keyof ScoringWeights)[]).map((k) => (
            <label key={k} className="block">
              <span className="flex justify-between text-sm font-bold">
                {WEIGHT_LABELS[k]} <span className="tabular text-mint-700">{draft.weights[k]}</span>
              </span>
              <input
                type="range"
                min={0}
                max={60}
                value={draft.weights[k]}
                onChange={(e) => setDraft((d) => ({ ...d, weights: { ...d.weights, [k]: Number(e.target.value) } }))}
                className="w-full accent-mint-600"
              />
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberField label="Score minimum d’un « bon créneau »" unit="/100" value={draft.windowThreshold} onChange={(v) => setDraft((d) => ({ ...d, windowThreshold: v }))} />
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-bold">
            <input type="checkbox" className="h-5 w-5 accent-mint-600" checked={draft.daylightOnly} onChange={(e) => setDraft((d) => ({ ...d, daylightOnly: e.target.checked }))} />
            Créneaux uniquement entre lever et coucher du soleil
          </label>
        </div>
      </section>

      {/* Config par spot */}
      <section className="card card-pad">
        <h2 className="font-display text-lg font-extrabold">Configuration par spot</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {SPOTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSpotId(s.id)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-bold ${spotId === s.id ? 'border-night bg-night text-white' : 'border-mint-200 bg-cream-50'}`}
            >
              {s.shortName}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
          <div>
            <p className="label mb-2">1. Choisissez une catégorie puis cliquez sur les secteurs</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(Object.keys(SECTOR_RATING_META) as SectorRating[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setBrush(r)}
                  className={`chip border-2 px-3 py-1.5 text-sm ${brush === r ? 'border-night' : 'border-transparent'}`}
                  style={{ background: SECTOR_RATING_META[r].color, color: r === 'ok' ? '#0B2A20' : '#fff' }}
                  aria-pressed={brush === r}
                >
                  {SECTOR_RATING_META[r].label}
                </button>
              ))}
            </div>
            <WindRose
              sectors={cfg.sectors}
              onSectorClick={(i) => {
                const next = [...cfg.sectors];
                next[i] = brush;
                setCfg({ sectors: next });
              }}
              size={340}
            />
            {dangerCount === 0 && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-rate-mid">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Aucune orientation dangereuse définie pour ce spot.
              </p>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <p className="label mb-2">Détail des 16 secteurs</p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {SECTOR_CODES.map((code, i) => (
                  <label key={code} className="flex items-center gap-1.5 rounded-lg border border-mint-100 bg-cream-50 px-2 py-1 text-xs">
                    <span className="w-9 font-extrabold" title={SECTOR_NAMES[code]}>
                      {code}
                    </span>
                    <select
                      className="min-w-0 flex-1 bg-transparent font-semibold outline-none"
                      value={cfg.sectors[i]}
                      onChange={(e) => {
                        const next = [...cfg.sectors];
                        next[i] = e.target.value as SectorRating;
                        setCfg({ sectors: next });
                      }}
                      style={{ color: SECTOR_RATING_META[cfg.sectors[i]].color }}
                      title={sectorRange(i)}
                    >
                      {(Object.keys(SECTOR_RATING_META) as SectorRating[]).map((r) => (
                        <option key={r} value={r}>
                          {SECTOR_RATING_META[r].label}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="label mb-2">2. Plages de vitesse du vent (nœuds)</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <NumberField label="Trop faible sous" unit="nds" value={cfg.speed.minRideable} onChange={(v) => setCfg({ speed: { ...cfg.speed, minRideable: v } })} />
                <NumberField label="Idéal à partir de" unit="nds" value={cfg.speed.idealMin} onChange={(v) => setCfg({ speed: { ...cfg.speed, idealMin: v } })} />
                <NumberField label="Idéal jusqu’à (fort au-delà)" unit="nds" value={cfg.speed.idealMax} onChange={(v) => setCfg({ speed: { ...cfg.speed, idealMax: v } })} />
                <NumberField label="Excessif au-delà" unit="nds" value={cfg.speed.maxRideable} onChange={(v) => setCfg({ speed: { ...cfg.speed, maxRideable: v } })} />
              </div>
              <div className="mt-3 flex h-3 overflow-hidden rounded-full text-[0px]">
                {(() => {
                  const max = Math.max(cfg.speed.maxRideable + 8, 40);
                  const seg = (a: number, b: number, c: string) => <div style={{ width: `${(Math.max(0, b - a) / max) * 100}%`, background: c }} />;
                  return (
                    <>
                      {seg(0, cfg.speed.minRideable, '#E5484D')}
                      {seg(cfg.speed.minRideable, cfg.speed.idealMin, '#F2994A')}
                      {seg(cfg.speed.idealMin, cfg.speed.idealMax, '#0F7A43')}
                      {seg(cfg.speed.idealMax, cfg.speed.maxRideable, '#3DBE6A')}
                      {seg(cfg.speed.maxRideable, max, '#9B1C1F')}
                    </>
                  );
                })()}
              </div>
              <p className="mt-1 text-[11px] text-ink-700">Rouge : trop faible · orange : léger · vert foncé : idéal · vert : fort · bordeaux : excessif</p>
            </div>

            {(() => {
              const cal = calibrate(reports, spotId, cfg);
              return (
                <div className="rounded-xl border border-mint-200 bg-mint-50/50 p-3">
                  <p className="font-display text-sm font-extrabold">👥 Ce que disent les retours du club</p>
                  {cal.count < MIN_REPORTS ? (
                    <p className="mt-1 text-xs text-ink-700">
                      {cal.count} retour{cal.count > 1 ? 's' : ''} avec vent prévu sur ce spot (12 derniers mois) : il en faut au moins {MIN_REPORTS} pour proposer des
                      réglages.
                    </p>
                  ) : (
                    <>
                      <p className="mt-1 text-xs text-ink-700">
                        {cal.count} retours : {(['trop faible', 'bon', 'fort', 'trop fort'] as const)
                          .filter((f) => cal.byFeel[f].length)
                          .map((f) => `« ${f} » ${cal.byFeel[f].length}× (vers ${Math.round(cal.byFeel[f].reduce((a, b) => a + b, 0) / cal.byFeel[f].length)} nds)`)
                          .join(' · ')}
                      </p>
                      {cal.suggestions.length ? (
                        <ul className="mt-2 space-y-2">
                          {cal.suggestions.map((sg) => (
                            <li key={sg.field} className="flex flex-wrap items-center gap-2 text-sm">
                              <span>
                                <strong>{sg.label}</strong> : {sg.current} → <strong className="text-mint-700">{sg.suggested} nds</strong>
                              </span>
                              <button className="btn-ghost !px-2.5 !py-1 text-xs" onClick={() => setCfg({ speed: { ...cfg.speed, [sg.field]: sg.suggested } })}>
                                Appliquer
                              </button>
                              <span className="w-full text-xs text-ink-700">{sg.why}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-1 text-xs font-bold text-mint-700">Les seuils actuels correspondent bien au ressenti du club.</p>
                      )}
                      <p className="mt-2 text-[11px] text-ink-700/70">
                        Basé sur le vent prévu par le modèle au moment de chaque retour et le ressenti déclaré. « Appliquer » modifie le brouillon : vérifiez puis
                        enregistrez ou publiez.
                      </p>
                    </>
                  )}
                </div>
              );
            })()}

            <div>
              <p className="label mb-2">3. Rafales</p>
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Rafale max acceptable" unit="nds" value={cfg.gusts.maxGust} onChange={(v) => setCfg({ gusts: { ...cfg.gusts, maxGust: v } })} />
                <NumberField
                  label="Rapport rafale / moyen max"
                  unit="×"
                  step={0.1}
                  value={cfg.gusts.maxGustFactor}
                  onChange={(v) => setCfg({ gusts: { ...cfg.gusts, maxGustFactor: v } })}
                />
              </div>
            </div>

            {(SPOT_BY_ID[spotId].stations?.length ?? 0) > 0 && (
              <label className="flex items-start gap-2 rounded-xl border border-mint-100 bg-mint-50/60 p-3 text-sm">
                <input type="checkbox" className="mt-0.5 h-5 w-5 accent-mint-600" checked={!!cfg.useStation} onChange={(e) => setCfg({ useStation: e.target.checked })} />
                <span>
                  <strong>Utiliser la balise pour le vent actuel</strong>
                  <span className="block text-xs text-ink-700">
                    Si la balise {stations[spotId]?.[0]?.name ?? ''} a une mesure de moins de 30 min, elle remplace le modèle pour la note actuelle. À activer
                    seulement si la balise est représentative du plan d’eau
                    {stations[spotId]?.[0]?.distanceKm != null && ` (elle est à ${stations[spotId][0].distanceKm!.toFixed(1)} km)`}.
                  </span>
                </span>
              </label>
            )}

            <label className="block">
              <span className="label">Notes / restrictions locales</span>
              <textarea className="input mt-1 min-h-[80px]" value={cfg.notes} onChange={(e) => setCfg({ notes: e.target.value })} />
            </label>

            <button className="btn-ghost" onClick={() => setCfg(structuredClone(SPOT_BY_ID[spotId].defaults))}>
              <RotateCcw className="h-4 w-4" /> Valeurs initiales de ce spot
            </button>
          </div>
        </div>
      </section>

      {errors.length > 0 && (
        <div className="rounded-xl border border-rate-bad/40 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errors.map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      )}

      {/* Barre d'actions (portail : hors du <main> animé, sinon `fixed` ne fonctionne pas) */}
      {createPortal(
      <div className="fixed inset-x-0 bottom-[68px] z-30 border-t border-mint-100 bg-cream-50/95 px-4 py-2.5 backdrop-blur md:bottom-0">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
          <button className="btn-primary" onClick={onSave} disabled={!!errors.length || !dirty}>
            {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} {saved ? 'Enregistré' : 'Enregistrer'}
          </button>
          <button className="btn-ghost" onClick={onExport}>
            <Download className="h-4 w-4" /> Exporter
          </button>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Importer
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = '';
            }}
          />
          <button
            className="btn-ghost"
            onClick={() => {
              if (confirm('Supprimer les réglages personnalisés de cet appareil ?')) {
                resetSettings();
                setDraft(structuredClone(clubSettings ?? buildDefaultSettings()));
              }
            }}
          >
            <RotateCcw className="h-4 w-4" /> Réinitialiser
          </button>
          {dirty && <span className="text-xs font-bold text-rate-mid">Modifications non enregistrées</span>}
        </div>
      </div>,
      document.body,
      )}
    </div>
  );
}

/** Connexion admin (code par e-mail) et publication des réglages pour tout le club. */
function AdminLogin({ draft, onPublished, hasRemote }: { draft: ClubSettings; onPublished: () => void; hasRemote: boolean }) {
  const [session, setSession] = useState<AdminSession | null>(() => loadAdminSession());
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!backendEnabled) {
    return (
      <section className="card card-pad text-sm">
        <h2 className="font-display text-lg font-extrabold">Publication en ligne</h2>
        <p className="mt-1 text-ink-700">
          Pas encore activée : sans base de données, partagez les réglages avec « Exporter » puis le fichier <code>public/club-settings.json</code>. Pour publier
          en un clic avec connexion sécurisée des admins, suivez « Activer les fonctions communautaires » dans le README.
        </p>
      </section>
    );
  }

  const run = async (f: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try {
      await f();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card card-pad">
      <h2 className="font-display text-lg font-extrabold">Publication pour tout le club</h2>
      {session ? (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          <span>
            Connecté : <strong>{session.email}</strong>
          </span>
          <button
            className="btn-primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await publishSettings(draft, session);
                setMsg('Réglages publiés : tous les membres les reçoivent.');
                onPublished();
              })
            }
          >
            Publier ces réglages
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              logoutAdmin();
              setSession(null);
            }}
          >
            Se déconnecter
          </button>
          {hasRemote && <span className="text-xs text-ink-700">Des réglages sont déjà publiés en ligne.</span>}
        </div>
      ) : step === 'email' ? (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="block flex-1">
            <span className="label">E-mail d’admin</span>
            <input className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button
            className="btn-primary"
            disabled={busy || !email.includes('@')}
            onClick={() =>
              run(async () => {
                await sendLoginCode(email.trim());
                setStep('code');
                setMsg('Code envoyé : consultez vos e-mails.');
              })
            }
          >
            Recevoir un code
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="label">Code reçu par e-mail</span>
            <input className="input mt-1 tabular" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <button
            className="btn-primary"
            disabled={busy || code.trim().length < 6}
            onClick={() =>
              run(async () => {
                setSession(await verifyLoginCode(email.trim(), code));
                setMsg(null);
              })
            }
          >
            Se connecter
          </button>
          <button className="btn-ghost" onClick={() => setStep('email')}>
            Changer d’e-mail
          </button>
        </div>
      )}
      {msg && <p className="mt-2 text-sm font-bold text-mint-700">{msg}</p>}
      <p className="mt-2 text-[11px] text-ink-700/70">Seuls les e-mails invités comme admins dans Supabase peuvent se connecter.</p>
    </section>
  );
}
