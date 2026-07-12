import { useState, useEffect } from "react";
import {
  Brain,
  ToggleLeft,
  ToggleRight,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";
import { apiFetch } from "../../lib/api";

export default function AdminAcpManager() {
  const [accesses, setAccesses] = useState<any[]>([]);
  const [orgsWithoutAccess, setOrgsWithoutAccess] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchAccessList = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/acp/access/list");
      if (res.ok) {
        const data = await res.json();
        setAccesses(data.accesses || []);
        setOrgsWithoutAccess(data.orgsWithoutAccess || []);
      }
    } catch (err) {
      console.error("[ACP_MANAGER_ERROR]", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccessList();
  }, []);

  const handleToggle = async (orgId: string, currentlyEnabled: boolean) => {
    setToggling(orgId);
    try {
      const res = await apiFetch("/api/acp/access/toggle", {
        method: "POST",
        body: JSON.stringify({ organizationId: orgId, enabled: !currentlyEnabled }),
      });
      if (res.ok) {
        await fetchAccessList();
      }
    } catch (err) {
      console.error("[ACP_TOGGLE_ERROR]", err);
    } finally {
      setToggling(null);
    }
  };

  const enabledOrgs = accesses.filter((a) => a.acpEnabled);
  const disabledAccesses = accesses.filter((a) => !a.acpEnabled);

  const filterOrgs = (list: any[]) =>
    list.filter((o) => {
      const name = (o.organization?.name || o.name || "").toLowerCase();
      return name.includes(search.toLowerCase());
    });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orquestrador ACP — Liberação</h1>
          <p className="text-sm text-gray-500">
            Controle quais organizações têm acesso ao módulo ACP v2.0.
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs">
          <Brain size={16} />
          ACP v2.0
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Buscar organização..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filterOrgs(enabledOrgs).length > 0 && (
            <>
              <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-wide flex items-center gap-2 mt-2">
                <CheckCircle2 size={16} /> Liberadas ({filterOrgs(enabledOrgs).length})
              </h2>
              {filterOrgs(enabledOrgs).map((access) => (
                <motion.div
                  key={access.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-[24px] border border-emerald-100 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {access.organization?.name || "N/A"}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
                        LIBERADO
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(access.organizationId, true)}
                    disabled={toggling === access.organizationId}
                    className="text-emerald-500 hover:text-emerald-600 transition-colors disabled:opacity-50"
                  >
                    {toggling === access.organizationId ? (
                      <Loader2 className="animate-spin" size={36} />
                    ) : (
                      <ToggleRight size={40} />
                    )}
                  </button>
                </motion.div>
              ))}
            </>
          )}

          {filterOrgs(disabledAccesses).length > 0 && (
            <>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2 mt-6">
                <XCircle size={16} /> Bloqueadas ({filterOrgs(disabledAccesses).length})
              </h2>
              {filterOrgs(disabledAccesses).map((access) => (
                <motion.div
                  key={access.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {access.organization?.name || "N/A"}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-400">
                        BLOQUEADO
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(access.organizationId, false)}
                    disabled={toggling === access.organizationId}
                    className="text-gray-300 hover:text-emerald-500 transition-colors disabled:opacity-50"
                  >
                    {toggling === access.organizationId ? (
                      <Loader2 className="animate-spin" size={36} />
                    ) : (
                      <ToggleLeft size={40} />
                    )}
                  </button>
                </motion.div>
              ))}
            </>
          )}

          {filterOrgs(orgsWithoutAccess).length > 0 && (
            <>
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide flex items-center gap-2 mt-6">
                <Building2 size={16} /> Sem Registro ({filterOrgs(orgsWithoutAccess).length})
              </h2>
              {filterOrgs(orgsWithoutAccess).map((org) => (
                <motion.div
                  key={org.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{org.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-400">
                        SEM ACESSO
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(org.id, false)}
                    disabled={toggling === org.id}
                    className="text-gray-300 hover:text-emerald-500 transition-colors disabled:opacity-50"
                  >
                    {toggling === org.id ? (
                      <Loader2 className="animate-spin" size={36} />
                    ) : (
                      <ToggleLeft size={40} />
                    )}
                  </button>
                </motion.div>
              ))}
            </>
          )}

          {filterOrgs(enabledOrgs).length === 0 &&
            filterOrgs(disabledAccesses).length === 0 &&
            filterOrgs(orgsWithoutAccess).length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <Building2 size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-bold">Nenhuma organização encontrada</p>
                <p className="text-sm mt-1">Tente ajustar sua busca.</p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
