import { apiClient } from "../../../shared/api/apiClient";

const unwrap = (res) => res.data?.data ?? null;

export const getAiOverview = async (days) => unwrap(await apiClient.get("/ai/admin/overview", { params: { days } }));
export const saveAiSettings = async (settings) => unwrap(await apiClient.put("/ai/admin/settings", settings));
export const resetAiQuota = async (ip) => unwrap(await apiClient.post("/ai/admin/quota/reset", { ip }));
export const getAiPrompts = async () => unwrap(await apiClient.get("/ai/admin/prompts"))?.items || [];
export const createAiPrompt = async (payload) => unwrap(await apiClient.post("/ai/admin/prompts", payload));
export const activateAiPrompt = async (id) => unwrap(await apiClient.put(`/ai/admin/prompts/${id}/activate`));
export const getAiTraces = async (params) => unwrap(await apiClient.get("/ai/admin/traces", { params }));
export const getAiTrace = async (id) => unwrap(await apiClient.get(`/ai/admin/traces/${id}`));
