import { FormEvent, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Building2, CheckCircle2, ExternalLink, Loader2, MapPinned, Send,
  Play, Plus, RefreshCw, Search, Trash2, XCircle,
} from "lucide-react";
import { apiFetch, readJsonResponse } from "../../lib/api";

type Profile = {
  id: string; name: string; placeId?: string | null; cid?: string | null;
  address?: string | null; latitude: number; longitude: number;
  sourceUrl?: string | null; category?: string | null; phone?: string | null;
  website?: string | null; rating?: number | null; reviewsCount?: number | null;
  auditScore?: number | null; auditData?: any;
};

type Scan = {
  id: string; keyword: string; status: string; gridSize: number; radiusKm: number;
  totalPoints: number; processedPoints: number; averageRank?: number | null;
  top3Percent?: number | null; top10Percent?: number | null; foundPercent?: number | null;
  error?: string | null; profile: Profile; points?: any[]; createdAt: string;
};

function rankColor(rank?: number | null, status?: string) {
  if (status === "PENDING" || status === "RUNNING") return "#94a3b8";
  if (!rank) return "#dc2626";
  if (rank === 1) return "#16a34a";
  if (rank === 2) return "#f97316";
  return "#dc2626";
}

function RankingMap({ scan }: { scan: Scan }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!containerRef.current || !scan.points?.length) return;
    const map = L.map(containerRef.current);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap", maxZoom: 19,
    }).addTo(map);
    const bounds = L.latLngBounds([]);
    scan.points.forEach((point) => {
      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: 18, color: "#fff", weight: 3,
        fillColor: rankColor(point.rank, point.status), fillOpacity: .95,
      }).addTo(map);
      marker.bindTooltip(String(point.rank || "×"), {
        permanent: true, direction: "center", className: "google-local-rank-label",
      });
      bounds.extend([point.latitude, point.longitude]);
    });
    map.fitBounds(bounds.pad(.18));
    return () => { map.remove(); };
  }, [scan]);
  return <div ref={containerRef} className="h-[520px] w-full overflow-hidden rounded-[24px] border border-gray-200" />;
}

export default function GoogleLocal() {
  const [access, setAccess] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [discoveryForm, setDiscoveryForm] = useState({ name: "", city: "", state: "", url: "" });
  const [candidates, setCandidates] = useState<any[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [scanForm, setScanForm] = useState({ profileId: "", keyword: "", gridSize: "5", radiusKm: "5" });
  const [customRadiusKm, setCustomRadiusKm] = useState("15");

  const loadData = async () => {
    setLoading(true);
    try {
      const accessData = await (await apiFetch("/api/google-local/access")).json();
      setAccess(accessData);
      if (!accessData.enabled) return;
      const [profileData, scanData] = await Promise.all([
        apiFetch("/api/google-local/profiles").then((r) => r.json()),
        apiFetch("/api/google-local/scans").then((r) => r.json()),
      ]);
      const loadedProfiles = profileData.profiles || [];
      setProfiles(loadedProfiles);
      setScans(scanData.scans || []);
      setSelectedProfile((current) => current || loadedProfiles[0] || null);
      setScanForm((current) => ({ ...current, profileId: current.profileId || loadedProfiles[0]?.id || "" }));
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (!selectedScan || !["PENDING", "RUNNING"].includes(selectedScan.status)) return;
    const timer = window.setInterval(async () => {
      const response = await apiFetch(`/api/google-local/scans/${selectedScan.id}`);
      if (!response.ok) return;
      const { scan } = await response.json();
      setSelectedScan(scan);
      setScans((current) => current.map((item) => item.id === scan.id ? scan : item));
    }, 4000);
    return () => window.clearInterval(timer);
  }, [selectedScan?.id, selectedScan?.status]);

  const discoverProfiles = async (event: FormEvent) => {
    event.preventDefault();
    setDiscovering(true); setCandidates([]); setMessage("");
    try {
      const start = await apiFetch("/api/google-local/discover", {
        method: "POST", body: JSON.stringify(discoveryForm),
      });
      const startData = await readJsonResponse(start, "Falha ao iniciar a busca. O proxy retornou uma resposta inválida.");
      if (!start.ok) throw new Error(startData.error || "Não foi possível iniciar a busca.");
      if (startData.status === "COMPLETED") {
        setCandidates(startData.candidates || []);
        if (startData.message) setMessage(startData.message);
        if (!startData.candidates?.length) setMessage("Nenhum perfil encontrado. Inclua a cidade ou cole a URL completa.");
        return;
      }
      if (!startData.jobId) throw new Error("A busca não retornou um identificador válido.");
      for (let attempt = 0; attempt < 80; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const response = await apiFetch(`/api/google-local/discover/${startData.jobId}`);
        const data = await readJsonResponse(response, "Falha ao consultar a busca. O proxy retornou uma resposta inválida.");
        if (!response.ok) throw new Error(data.error || "Falha ao consultar o perfil.");
        if (data.status === "FAILED") throw new Error("A busca no Google Maps falhou.");
        if (data.status === "COMPLETED") {
          const foundCandidates = data.candidates?.length
            ? data.candidates
            : startData.fallbackCandidate
              ? [startData.fallbackCandidate]
              : [];
          setCandidates(foundCandidates);
          if (!data.candidates?.length && startData.fallbackCandidate) {
            setMessage("Não consegui puxar todos os dados pelo coletor, mas extraí o perfil correto a partir do link.");
          } else if (!data.candidates?.length) {
            setMessage("Nenhum perfil encontrado. Inclua a cidade ou cole a URL completa.");
          }
          return;
        }
      }
      throw new Error("A busca demorou mais que o esperado.");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setDiscovering(false); }
  };

  const importProfile = async (candidate: any) => {
    setSaving(true); setMessage("");
    try {
      const response = await apiFetch("/api/google-local/profiles", {
        method: "POST", body: JSON.stringify({ ...candidate, competitors: candidates }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível importar o perfil.");
      setProfiles((current) => [data.profile, ...current]);
      setSelectedProfile(data.profile);
      setScanForm((current) => ({ ...current, profileId: data.profile.id }));
      setCandidates([]); setDiscoveryForm({ name: "", city: "", state: "", url: "" }); setShowDiscovery(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setSaving(false); }
  };

  const sendProfileToCrm = async (profile: Profile) => {
    setSaving(true); setMessage("");
    try {
      const response = await apiFetch(`/api/google-local/profiles/${profile.id}/send-to-crm`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível enviar para o CRM.");
      setMessage(data.duplicated ? "Esse perfil já estava no CRM." : "Perfil enviado para o CRM como lead.");
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setSaving(false); }
  };

  const createScan = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await apiFetch("/api/google-local/scans", {
        method: "POST",
        body: JSON.stringify({
          ...scanForm,
          radiusKm: scanForm.radiusKm === "custom" ? customRadiusKm : scanForm.radiusKm,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível iniciar a análise.");
      setSelectedScan(data.scan); setScans((current) => [data.scan, ...current]);
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setSaving(false); }
  };

  const openScan = async (id: string) => {
    const response = await apiFetch(`/api/google-local/scans/${id}`);
    if (response.ok) setSelectedScan((await response.json()).scan);
  };

  const removeProfile = async (id: string) => {
    if (!window.confirm("Excluir este perfil e todo o histórico?")) return;
    if ((await apiFetch(`/api/google-local/profiles/${id}`, { method: "DELETE" })).ok) await loadData();
  };

  if (loading) return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;
  if (!access?.enabled) return (
    <div className="mx-auto max-w-2xl rounded-[32px] border border-amber-200 bg-amber-50 p-10 text-center">
      <MapPinned className="mx-auto mb-4 text-amber-600" size={48} />
      <h1 className="text-2xl font-black">Google Local não liberado</h1>
      <p className="mt-2 text-sm text-gray-600">Solicite ao Super Admin a liberação para sua conta.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-black">Nexus GBP Analyzer</h1><p className="text-sm text-gray-500">Busca empresas no Google Maps, audita o perfil, compara concorrentes e mantém o mapa de posicionamento.</p></div>
        <button onClick={() => setShowDiscovery((value) => !value)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white"><Plus size={18} /> Buscar perfil</button>
      </div>
      {message && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{message}</div>}

      {showDiscovery && (
        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="font-black">Buscar empresas no Google Maps</h2>
          <p className="mb-4 text-sm text-gray-500">Use palavra-chave + cidade para listar concorrentes ou cole a URL de um perfil específico.</p>
          <form onSubmit={discoverProfiles} className="grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr_100px_auto]">
            <input className="modal-input" placeholder="Palavra-chave ou nome: advogado previdenciário" value={discoveryForm.name} onChange={(e) => setDiscoveryForm({ ...discoveryForm, name: e.target.value })} />
            <input className="modal-input" placeholder="Cidade" value={discoveryForm.city} onChange={(e) => setDiscoveryForm({ ...discoveryForm, city: e.target.value })} />
            <input className="modal-input" placeholder="UF" maxLength={2} value={discoveryForm.state} onChange={(e) => setDiscoveryForm({ ...discoveryForm, state: e.target.value.toUpperCase() })} />
            <button disabled={discovering || (!discoveryForm.name.trim() && !discoveryForm.url.trim())} className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-3 font-bold text-white disabled:opacity-50">
              {discovering ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}{discovering ? "Buscando..." : "Localizar"}
            </button>
            <div className="md:col-span-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" /><span className="text-[10px] font-bold uppercase text-gray-400">ou cole o link</span><div className="h-px flex-1 bg-gray-200" />
            </div>
            <input className="modal-input md:col-span-4" type="url" placeholder="https://www.google.com/maps/place/..." value={discoveryForm.url} onChange={(e) => setDiscoveryForm({ ...discoveryForm, url: e.target.value })} />
          </form>
          {discovering && <p className="mt-3 text-xs text-gray-500">Busca por palavra-chave usa o scraper e pode levar alguns minutos. URL de perfil responde na hora.</p>}
          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {candidates.map((candidate, index) => (
              <div key={`${candidate.placeId || candidate.cid || index}`} className="rounded-2xl border border-gray-200 p-4">
                <div className="flex gap-3">
                  <div className="flex-1"><h3 className="font-black">{candidate.name}</h3><p className="text-xs text-gray-500">{candidate.category || "Sem categoria"} · {candidate.address}</p><p className="mt-2 text-xs font-bold text-amber-600">★ {candidate.rating || "—"} · {candidate.reviewsCount || 0} avaliações</p></div>
                  {candidate.thumbnail && <img src={candidate.thumbnail} alt="" className="h-16 w-16 rounded-xl object-cover" />}
                </div>
                <button onClick={() => importProfile(candidate)} disabled={saving} className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Importar e analisar</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          {selectedProfile?.auditData && (
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase text-indigo-500">Auditoria do perfil</p><h2 className="text-xl font-black">{selectedProfile.name}</h2><p className="text-sm text-gray-500">{selectedProfile.category} · ★ {selectedProfile.rating || "—"} · {selectedProfile.reviewsCount || 0} avaliações</p></div>
                <div className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-black text-white ${(selectedProfile.auditScore || 0) >= 70 ? "bg-emerald-500" : (selectedProfile.auditScore || 0) >= 50 ? "bg-amber-500" : "bg-red-500"}`}>{selectedProfile.auditScore}</div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-indigo-50 p-4">
                  <p className="text-[10px] font-black uppercase text-indigo-500">Oportunidade comercial</p>
                  <p className="text-3xl font-black text-indigo-900">{selectedProfile.auditData.opportunityScore ?? selectedProfile.auditScore ?? "—"}</p>
                  <p className="text-xs font-semibold text-indigo-700">{selectedProfile.auditData.commercialTemperature || "Sem classificação"}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[10px] font-black uppercase text-gray-400">Concorrentes analisados</p>
                  <p className="text-3xl font-black">{selectedProfile.auditData.competition?.totalCompetitors ?? 0}</p>
                  <p className="text-xs text-gray-500">Média reviews: {selectedProfile.auditData.competition?.avgReviews?.toFixed?.(0) || "—"}</p>
                </div>
                <button onClick={() => sendProfileToCrm(selectedProfile)} disabled={saving} className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 p-4 text-sm font-black text-white disabled:opacity-50">
                  <Send size={18} /> Enviar para CRM
                </button>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                {selectedProfile.auditData.checks?.map((check: any) => (
                  <div key={check.key} className={`flex items-center gap-3 rounded-xl p-3 ${check.passed ? "bg-emerald-50" : "bg-red-50"}`}>
                    {check.passed ? <CheckCircle2 className="text-emerald-600" size={18} /> : <XCircle className="text-red-500" size={18} />}<span className="text-sm font-semibold">{check.label}</span>
                  </div>
                ))}
              </div>
              {selectedProfile.auditData.diagnosis && <div className="mt-5 whitespace-pre-line rounded-2xl bg-indigo-50 p-4 text-sm font-semibold text-indigo-950">{selectedProfile.auditData.diagnosis}</div>}
              {!!selectedProfile.auditData.competition?.strongerCompetitors?.length && <div className="mt-5 rounded-2xl border border-gray-100 p-4"><h3 className="font-black">Concorrentes mais fortes</h3><div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">{selectedProfile.auditData.competition.strongerCompetitors.map((item: any) => <div key={item.name} className="rounded-xl bg-gray-50 p-3"><p className="text-sm font-bold">{item.name}</p><p className="text-xs text-gray-500">★ {item.rating || "—"} · {item.reviewsCount || 0} avaliações</p></div>)}</div></div>}
              {!!selectedProfile.auditData.recommendations?.length && <div className="mt-5 rounded-2xl bg-amber-50 p-4"><h3 className="font-black text-amber-800">Prioridades</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">{selectedProfile.auditData.recommendations.map((item: string) => <li key={item}>{item}</li>)}</ul></div>}
              {selectedProfile.sourceUrl && <a href={selectedProfile.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-indigo-600"><ExternalLink size={16} /> Abrir no Google</a>}
            </div>
          )}

          <form onSubmit={createScan} className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3"><Search className="text-indigo-500" /><h2 className="font-black">Nova análise de posicionamento</h2></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <select required className="modal-input" value={scanForm.profileId} onChange={(e) => setScanForm({ ...scanForm, profileId: e.target.value })}><option value="">Selecione o perfil</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select>
              <input required className="modal-input" placeholder="Palavra-chave: dentista" value={scanForm.keyword} onChange={(e) => setScanForm({ ...scanForm, keyword: e.target.value })} />
              <select className="modal-input" value={scanForm.gridSize} onChange={(e) => setScanForm({ ...scanForm, gridSize: e.target.value })}><option value="3">Grade 3 × 3</option><option value="5">Grade 5 × 5</option><option value="7">Grade 7 × 7</option></select>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <select className="modal-input" value={scanForm.radiusKm} onChange={(e) => setScanForm({ ...scanForm, radiusKm: e.target.value })}><option value="5">Raio 5 km</option><option value="10">Raio 10 km</option><option value="15">Raio 15 km</option><option value="custom">Personalizado</option></select>
                {scanForm.radiusKm === "custom" && (
                  <input
                    required
                    className="modal-input w-28"
                    min="0.5"
                    max="50"
                    step="0.5"
                    type="number"
                    value={customRadiusKm}
                    onChange={(e) => setCustomRadiusKm(e.target.value)}
                    aria-label="Raio personalizado em km"
                  />
                )}
              </div>
            </div>
            <button disabled={saving || !profiles.length} className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><Play size={17} /> Iniciar Geo Grid</button>
          </form>

          {selectedScan ? <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex justify-between"><div><p className="text-xs font-bold uppercase text-indigo-500">{selectedScan.profile.name}</p><h2 className="text-xl font-black">{selectedScan.keyword}</h2><p className="text-xs text-gray-500">{selectedScan.processedPoints}/{selectedScan.totalPoints} pontos</p></div>{["PENDING", "RUNNING"].includes(selectedScan.status) && <Loader2 className="animate-spin text-indigo-500" />}</div>
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">{[["Posição média", selectedScan.averageRank?.toFixed(1) || "—"], ["Top 3", `${(selectedScan.top3Percent || 0).toFixed(0)}%`], ["Top 10", `${(selectedScan.top10Percent || 0).toFixed(0)}%`], ["Encontrado", `${(selectedScan.foundPercent || 0).toFixed(0)}%`]].map(([label, value]) => <div key={label} className="rounded-2xl bg-gray-50 p-4"><p className="text-[10px] font-bold uppercase text-gray-400">{label}</p><p className="text-2xl font-black">{value}</p></div>)}</div>
            <div className="mb-4 flex flex-wrap gap-3 text-xs font-bold text-gray-600">
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-emerald-600" /> 1a posicao</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-orange-500" /> 2a posicao</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-red-600" /> Demais posicoes</span>
            </div>
            {selectedScan.points?.length ? <RankingMap scan={selectedScan} /> : null}
          </div> : <div className="rounded-[28px] border border-dashed border-gray-300 p-16 text-center text-gray-400"><MapPinned className="mx-auto mb-3" size={42} /><p className="font-bold">Execute uma análise para visualizar o mapa.</p></div>}
        </div>

        <aside className="flex flex-col gap-6">
          <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm"><h3 className="mb-4 flex items-center gap-2 font-black"><Building2 size={18} /> Perfis</h3><div className="flex flex-col gap-2">
            {profiles.map((profile) => <div key={profile.id} className={`flex items-center rounded-xl p-3 ${selectedProfile?.id === profile.id ? "bg-indigo-50 ring-1 ring-indigo-200" : "bg-gray-50"}`}><button onClick={() => { setSelectedProfile(profile); setScanForm((current) => ({ ...current, profileId: profile.id })); }} className="min-w-0 flex-1 text-left"><p className="truncate text-sm font-bold">{profile.name}</p><p className="truncate text-[10px] text-gray-400">Nota {profile.auditScore ?? "—"} · {profile.rating || "—"} estrelas</p></button><button onClick={() => removeProfile(profile.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button></div>)}
            {!profiles.length && <p className="text-sm text-gray-400">Nenhum perfil cadastrado.</p>}
          </div></div>
          <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm"><div className="mb-4 flex justify-between"><h3 className="font-black">Histórico</h3><button onClick={loadData}><RefreshCw size={16} /></button></div><div className="flex max-h-[520px] flex-col gap-2 overflow-auto">{scans.map((scan) => <button key={scan.id} onClick={() => openScan(scan.id)} className="rounded-xl border p-3 text-left hover:bg-indigo-50"><p className="truncate text-sm font-bold">{scan.keyword}</p><p className="text-[10px] text-gray-500">{scan.profile.name} · {scan.gridSize}×{scan.gridSize} · {scan.status}</p></button>)}</div></div>
        </aside>
      </div>
    </div>
  );
}
