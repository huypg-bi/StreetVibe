import { useCallback, useEffect, useState } from "react";
import { activateAiPrompt, createAiPrompt, getAiPrompts, getAiTraces } from "../../api/aiApi";
import { DataTable, StatTile } from "./AiWidgets";
import Pagination from "../../../../shared/components/Pagination";
import {
    SOURCE_LABELS, STATUS_LABELS, formatMs, formatNumber, formatRate, formatTime, formatUsd,
} from "../../utils/aiFormat";
import { getErrorMessage, toast } from "../../../../shared/utils/toast";

function PromptManager({ stats, onChanged }) {
    const [prompts, setPrompts] = useState([]);
    const [draft, setDraft] = useState(null); // null = chưa mở trình soạn
    const [note, setNote] = useState("");
    const [activate, setActivate] = useState(true);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            setPrompts(await getAiPrompts());
        } catch (error) {
            console.error("Không thể tải prompt:", error);
            toast.error("Không thể tải các phiên bản prompt.");
        }
    }, []);

    useEffect(() => {
        const timeout = setTimeout(load, 0);
        return () => clearTimeout(timeout);
    }, [load]);

    const run = async (action, message) => {
        setSaving(true);
        try {
            await action();
            toast.success(message);
            await load();
            await onChanged();
            return true;
        } catch (error) {
            console.error(error);
            toast.error(getErrorMessage(error, "Không thể cập nhật prompt."));
            return false;
        } finally {
            setSaving(false);
        }
    };

    const submit = async (event) => {
        event.preventDefault();
        if (await run(() => createAiPrompt({ content: draft, note, activate }), "Đã tạo phiên bản prompt mới.")) {
            setDraft(null);
            setNote("");
        }
    };

    const rows = prompts.map((prompt) => ({ ...prompt, stats: stats.find((item) => item.version === prompt.version) }));
    const metric = (render) => (row) => (row.stats?.requests ? render(row.stats) : "—");

    return (
        <div className="ai-card">
            <h3>Phiên bản system prompt</h3>
            <DataTable
                rows={rows}
                columns={[
                    { label: "Bản", render: (row) => <strong>v{row.version}{row.active ? " ● ĐANG DÙNG" : ""}</strong> },
                    { label: "Ghi chú", render: (row) => <>{row.note || "—"}<small>{formatTime(row.created_at)} · {row.created_by}</small></> },
                    { label: "Lượt", numeric: true, render: metric((s) => formatNumber(s.requests)) },
                    { label: "Token / lượt", numeric: true, render: metric((s) => formatNumber(s.avg_tokens)) },
                    { label: "Độ trễ", numeric: true, render: metric((s) => formatMs(s.avg_latency_ms)) },
                    { label: "Chi phí / lượt", numeric: true, render: metric((s) => formatUsd(s.avg_cost_usd)) },
                    { label: "Nghi bịa", numeric: true, render: metric((s) => `${(s.flagged_rate * 100).toFixed(0)}%`) },
                    { label: "Thích / Không", numeric: true, render: metric((s) => `${s.likes} / ${s.dislikes}`) },
                    {
                        label: "Thao tác",
                        render: (row) => (
                            <span className="ai-actions">
                                <button type="button" className="ai-button" onClick={() => setDraft(row.content)}>XEM / SỬA</button>
                                {!row.active && (
                                    <button type="button" className="ai-button" disabled={saving} onClick={() => run(() => activateAiPrompt(row.id), `Đang dùng prompt v${row.version}.`)}>
                                        DÙNG BẢN NÀY
                                    </button>
                                )}
                            </span>
                        ),
                    },
                ]}
            />
            {draft !== null && (
                <form className="ai-form" onSubmit={submit}>
                    <label>
                        Nội dung prompt (lưu sẽ tạo phiên bản mới, bản cũ giữ nguyên)
                        <textarea rows="9" minLength={20} maxLength={4000} required value={draft} onChange={(event) => setDraft(event.target.value)} />
                    </label>
                    <label>
                        Ghi chú thay đổi
                        <input maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ví dụ: yêu cầu trả lời ngắn hơn" />
                    </label>
                    <label className="ai-check">
                        <input type="checkbox" checked={activate} onChange={(event) => setActivate(event.target.checked)} />
                        Dùng ngay phiên bản mới
                    </label>
                    <span className="ai-actions">
                        <button type="submit" className="ai-button primary" disabled={saving}>LƯU PHIÊN BẢN MỚI</button>
                        <button type="button" className="ai-button" onClick={() => setDraft(null)}>ĐÓNG</button>
                    </span>
                </form>
            )}
        </div>
    );
}

function TraceList({ refreshKey, onOpenTrace }) {
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [result, setResult] = useState({ items: [], total: 0, total_pages: 1 });

    useEffect(() => {
        let active = true;
        getAiTraces({ status, page })
            .then((data) => { if (active) setResult(data); })
            .catch((error) => {
                console.error("Không thể tải dấu vết:", error);
                if (active) toast.error("Không thể tải dấu vết.");
            });
        return () => { active = false; };
    }, [status, page, refreshKey]);

    return (
        <div className="ai-card">
            <div className="ai-card-head">
                <h3>Dấu vết từng yêu cầu ({formatNumber(result.total)})</h3>
                <select aria-label="Lọc theo trạng thái" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
                    <option value="">Mọi trạng thái</option>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
            </div>
            <DataTable
                rows={result.items}
                onRowClick={(row) => onOpenTrace(row.id)}
                columns={[
                    { label: "Thời gian", render: (row) => formatTime(row.created_at) },
                    { label: "Trạng thái", render: (row) => <span className={`ai-status ${row.status}`}>{STATUS_LABELS[row.status] || row.status}</span> },
                    { label: "Nguồn", render: (row) => SOURCE_LABELS[row.source] || "—" },
                    { label: "Model", render: (row) => row.model || "—" },
                    { label: "Lần gọi", numeric: true, render: (row) => <span className={row.attempts > 1 ? "ai-retry" : ""}>{row.attempts}{row.attempts > 1 ? " (thử lại)" : ""}</span> },
                    { label: "Token", numeric: true, render: (row) => formatNumber(row.prompt_tokens + row.completion_tokens) },
                    { label: "Thời gian chạy", numeric: true, render: (row) => (row.total_ms ? formatMs(row.total_ms) : "—") },
                ]}
            />
            <Pagination page={page} totalPages={result.total_pages} onChange={setPage} />
        </div>
    );
}

export default function AiTracingTab({ data, onReload, refreshKey, onOpenTrace }) {
    const cache = data.overview.cache;
    return (
        <>
            <div className="ai-tiles">
                <StatTile label="Trúng cache ứng dụng" value={formatRate(cache.hit_rate, cache.eligible)} hint={`${cache.hits}/${cache.eligible} yêu cầu không phải gọi model`} />
                <StatTile label="Token được Groq cache" value={formatRate(cache.provider_cached_ratio, data.overview.finops.prompt_tokens)} hint="Tỷ lệ trên tổng input token" />
            </div>
            <PromptManager stats={data.overview.prompts} onChanged={onReload} />
            <TraceList refreshKey={refreshKey} onOpenTrace={onOpenTrace} />
        </>
    );
}
