import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getAiOverview, getAiTrace } from "../../api/aiApi";
import AiCostTab from "./AiCostTab";
import AiPerformanceTab from "./AiPerformanceTab";
import AiQualityTab from "./AiQualityTab";
import AiTracingTab from "./AiTracingTab";
import AiTraceModal from "./AiTraceModal";
import { getErrorMessage, toast } from "../../../../shared/utils/toast";
import "../../styles/aiPanel.css";

const TABS = [
    ["cost", "Chi phí & Giới hạn"],
    ["performance", "Hiệu năng"],
    ["quality", "Chất lượng"],
    ["tracing", "Prompt & Tracing"],
];
const RANGES = [[1, "Hôm nay"], [7, "7 ngày"], [30, "30 ngày"]];

export default function AiPanel() {
    const [tab, setTab] = useState("cost");
    const [days, setDays] = useState(7);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [trace, setTrace] = useState(null);
    const closeTrace = useCallback(() => setTrace(null), []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setData(await getAiOverview(days));
        } catch (error) {
            console.error("Không thể tải số liệu AI:", error);
            toast.error(getErrorMessage(error, "Không thể tải số liệu AI."));
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => {
        const timeout = setTimeout(load, 0);
        return () => clearTimeout(timeout);
    }, [load]);

    const openTrace = async (id) => {
        try {
            setTrace(await getAiTrace(id));
        } catch (error) {
            console.error("Không thể tải dấu vết:", error);
            toast.error("Không thể tải chi tiết yêu cầu.");
        }
    };

    const refresh = () => {
        setRefreshKey((value) => value + 1);
        load();
    };

    return (
        <div className="ai-panel">
            <header className="ai-header">
                <div>
                    <h1>Quản lý AI</h1>
                    <p>Chi phí, hiệu năng, chất lượng và dấu vết của tính năng ghép outfit</p>
                </div>
                <div className="ai-filters">
                    <div className="ai-segment" role="group" aria-label="Khoảng thời gian">
                        {RANGES.map(([value, label]) => (
                            <button type="button" key={value} aria-pressed={days === value} onClick={() => setDays(value)}>{label}</button>
                        ))}
                    </div>
                    <button type="button" className="ai-button" title="Tải lại số liệu" aria-label="Tải lại số liệu" disabled={loading} onClick={refresh}>
                        <RefreshCw size={14} />
                    </button>
                </div>
            </header>

            <nav className="ai-tabs" role="tablist">
                {TABS.map(([key, label]) => (
                    <button type="button" role="tab" key={key} aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>
                ))}
            </nav>

            {!data ? (
                <p className="ai-empty">{loading ? "Đang tải số liệu..." : "Chưa tải được số liệu."}</p>
            ) : (
                <>
                    {!data.key_configured && <p className="ai-alert">Chưa cấu hình GROQ_API_KEY trong server/.env.</p>}
                    {data.blocked.code && <p className="ai-alert">AI đang ngừng gọi model: {data.blocked.message}.</p>}
                    {data.overview.truncated && <p className="ai-alert">Quá nhiều dữ liệu, số liệu chỉ tính trên các lượt mới nhất.</p>}
                    {tab === "cost" && <AiCostTab data={data} onReload={load} />}
                    {tab === "performance" && <AiPerformanceTab data={data} />}
                    {tab === "quality" && <AiQualityTab data={data} onOpenTrace={openTrace} />}
                    {tab === "tracing" && <AiTracingTab data={data} onReload={load} refreshKey={refreshKey} onOpenTrace={openTrace} />}
                </>
            )}

            {trace && <AiTraceModal trace={trace} onClose={closeTrace} />}
        </div>
    );
}
