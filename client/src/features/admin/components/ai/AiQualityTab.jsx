import { DataTable, StatTile } from "./AiWidgets";
import { formatNumber, formatRate, formatTime } from "../../utils/aiFormat";

export default function AiQualityTab({ data, onOpenTrace }) {
    const quality = data.overview.quality;
    const votes = quality.likes + quality.dislikes;

    return (
        <>
            <div className="ai-tiles">
                <StatTile label="Đúng định dạng JSON" value={formatRate(quality.format_rate, quality.responses)} hint={`${quality.valid_responses}/${quality.responses} phản hồi của model`} />
                <StatTile label="Nghi ngờ bịa thông tin" value={formatRate(quality.hallucination_rate, quality.checked)} hint={`${quality.flagged}/${quality.checked} lời giải thích`} />
                <StatTile label="Mức hài lòng" value={formatRate(quality.satisfaction_rate, votes)} hint={`${formatNumber(quality.likes)} thích · ${formatNumber(quality.dislikes)} không thích`} />
                <StatTile label="Phải ghép lại" value={formatRate(quality.follow_up_rate, quality.successful)} hint="Cùng người, cùng sản phẩm trong 30 phút" />
            </div>
            <p className="ai-note">
                “Nghi ngờ bịa” được kiểm tra tự động theo quy tắc: lời giải thích nhắc màu, môn thể thao, nhãn hàng không có trong bộ, hoặc nhắc giá.
                Cách này không bắt được mọi câu sai, nên vẫn cần đọc các mẫu bên dưới.
            </p>
            <div className="ai-card">
                <h3>Lời giải thích bị gắn cờ (mới nhất)</h3>
                <DataTable
                    empty="Chưa có lời giải thích nào bị gắn cờ."
                    rows={quality.samples}
                    onRowClick={(row) => onOpenTrace(row.id)}
                    columns={[
                        { label: "Thời gian", render: (row) => formatTime(row.created_at) },
                        { label: "Lời giải thích", render: (row) => row.reason || "(trống)" },
                        { label: "Lý do gắn cờ", render: (row) => row.flags.join("; ") },
                        { label: "Prompt", numeric: true, render: (row) => `v${row.prompt_version}` },
                    ]}
                />
            </div>
        </>
    );
}
