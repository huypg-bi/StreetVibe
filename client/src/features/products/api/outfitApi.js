import { apiClient } from "../../../shared/api/apiClient";

export async function getOutfitQuota() {
    const res = await apiClient.get("/outfits/quota");
    return res.data?.data || null;
}

export async function sendOutfitFeedback(traceId, vote) {
    await apiClient.post("/outfits/feedback", { trace_id: traceId, vote });
}

// AI có thể mất vài giây nên chờ lâu hơn mặc định
export async function suggestOutfit(payload) {
    const res = await apiClient.post("/outfits/suggest", payload, { timeout: 20000 });
    return res.data?.data || null;
}
