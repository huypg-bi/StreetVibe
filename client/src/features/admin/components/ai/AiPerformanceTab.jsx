import { ColumnChart, DataTable, StatTile } from "./AiWidgets";
import { BLOCK_LABELS, ERROR_LABELS, formatMs, formatNumber, formatRate } from "../../utils/aiFormat";

const countRows = (counts, labels) =>
    Object.entries(counts || {}).map(([key, count]) => ({ key, label: labels[key] || key, count }));

const countColumns = (label) => [
    { label, render: (row) => row.label },
    { label: "Số lần", numeric: true, render: (row) => formatNumber(row.count) },
];

export default function AiPerformanceTab({ data }) {
    const perf = data.overview.performance;
    const has = (value, format) => (perf.model_requests ? format(value) : "—");

    return (
        <>
            <div className="ai-tiles">
                <StatTile label="TTFT ước tính (trung bình)" value={has(perf.ttft_avg_ms, formatMs)} hint={`P95: ${has(perf.ttft_p95_ms, formatMs)}`} />
                <StatTile label="Thời gian chờ model" value={has(perf.latency_avg_ms, formatMs)} hint={`P95: ${has(perf.latency_p95_ms, formatMs)}`} />
                <StatTile label="Cả yêu cầu (trung bình)" value={has(perf.total_avg_ms, formatMs)} hint="Trình duyệt chờ tối đa 20 giây" />
                <StatTile label="Tốc độ sinh chữ" value={perf.tokens_per_second ? `${formatNumber(perf.tokens_per_second)} token/s` : "—"} />
                <StatTile label="Tỷ lệ lỗi" value={formatRate(perf.error_rate, perf.attempts)} hint={`${perf.failed_attempts}/${perf.attempts} lần gọi model`} />
                <StatTile label="Chuyển model dự phòng" value={formatRate(perf.fallback_rate, perf.model_requests)} hint={`${perf.fallback_requests}/${perf.model_requests} yêu cầu`} />
                <StatTile label="Phải dùng bộ lọc thay AI" value={formatNumber(perf.rule_results)} hint="Model lỗi hoặc bị chặn" />
                <StatTile label="Từ chối do hết lượt IP" value={formatNumber(perf.quota_rejections)} />
            </div>

            <ColumnChart
                title="Độ trễ trung bình theo ngày"
                stacked={false}
                days={data.overview.daily}
                format={formatMs}
                series={[
                    { key: "ttft_avg_ms", label: "TTFT ước tính" },
                    { key: "latency_avg_ms", label: "Chờ model" },
                ]}
            />
            <p className="ai-note">Groq chưa cho trả chữ dần (streaming) khi ép trả JSON theo khuôn, nên TTFT ước tính bằng thời gian xếp hàng cộng thời gian đọc đầu vào do Groq báo về.</p>

            <div className="ai-grid-2">
                <div className="ai-card"><h3>Lỗi khi gọi model</h3><DataTable columns={countColumns("Loại lỗi")} rows={countRows(perf.errors, ERROR_LABELS)} empty="Không có lỗi trong kỳ." /></div>
                <div className="ai-card"><h3>Bị chặn trước khi gọi</h3><DataTable columns={countColumns("Lý do")} rows={countRows(perf.blocked, BLOCK_LABELS)} empty="Không có lượt nào bị chặn." /></div>
            </div>
        </>
    );
}
