import AdminModal from "../AdminModal";
import { SOURCE_LABELS, STATUS_LABELS, formatMs, formatNumber, formatTime, formatUsd } from "../../utils/aiFormat";

function prettyJson(raw) {
    try {
        return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
        return raw;
    }
}

export default function AiTraceModal({ trace, onClose }) {
    const fields = [
        ["Thời gian", formatTime(trace.created_at)],
        ["Trạng thái", STATUS_LABELS[trace.status] || trace.status],
        ["Nguồn kết quả", SOURCE_LABELS[trace.source] || "—"],
        ["Người dùng", trace.user_email || `khách // ${trace.client_ip}`],
        ["IP", trace.client_ip],
        ["Model", trace.model || "—"],
        ["Prompt", trace.prompt_version ? `v${trace.prompt_version}` : "—"],
        ["Token (vào / cache / ra)", `${formatNumber(trace.prompt_tokens)} / ${formatNumber(trace.cached_tokens)} / ${formatNumber(trace.completion_tokens)}`],
        ["Chi phí ước tính", formatUsd(trace.cost_usd)],
        ["Cả yêu cầu", formatMs(trace.total_ms)],
        ["Phản hồi khách", trace.feedback === 1 ? "Thích" : trace.feedback === -1 ? "Không thích" : "—"],
        ["Trừ lượt", trace.counts_quota ? "Có" : "Không"],
    ];

    return (
        <AdminModal eyebrow="[ TRACE ]" titleId="ai-trace-title" title="Chi tiết yêu cầu AI" onClose={onClose} wide>
            <dl className="ai-trace-fields">
                {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
            {trace.error_message && <p className="ai-alert">{trace.error_message}</p>}
            <h3 className="ai-trace-title">Các bước</h3>
            {trace.steps?.length ? (
                <ol className="ai-steps">
                    {trace.steps.map((step, index) => (
                        <li key={`${step.name}-${index}`} className={step.status}>
                            <div><strong>{step.name}</strong><span>{formatMs(step.ms)}</span></div>
                            <p>[{step.status === "ok" ? "OK" : step.status === "warn" ? "CHÚ Ý" : "LỖI"}] {step.detail}</p>
                        </li>
                    ))}
                </ol>
            ) : <p className="ai-empty">Không có bước nào được ghi.</p>}
            {trace.reason && <><h3 className="ai-trace-title">Lời giải thích của AI</h3><p>{trace.reason}</p></>}
            {trace.flags?.length > 0 && <p className="ai-alert">Gắn cờ: {trace.flags.join("; ")}</p>}
            {trace.question && (
                <details>
                    <summary>Dữ liệu đã gửi cho model</summary>
                    <pre className="ai-pre">{prettyJson(trace.question)}</pre>
                </details>
            )}
        </AdminModal>
    );
}
