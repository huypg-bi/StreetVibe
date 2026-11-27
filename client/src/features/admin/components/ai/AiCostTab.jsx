import { useState } from "react";
import { resetAiQuota, saveAiSettings } from "../../api/aiApi";
import { ColumnChart, DataTable, Meter, StatTile } from "./AiWidgets";
import { formatCompact, formatNumber, formatTime, formatUsd } from "../../utils/aiFormat";
import { getErrorMessage, toast } from "../../../../shared/utils/toast";

const groupColumns = (label) => [
    { label, render: (row) => row.key },
    { label: "Lượt", numeric: true, render: (row) => formatNumber(row.requests) },
    { label: "Token", numeric: true, render: (row) => formatNumber(row.tokens) },
    { label: "Chi phí", numeric: true, render: (row) => formatUsd(row.cost_usd) },
];

const NUMBER_FIELDS = [
    ["daily_budget_usd", "Ngân sách ngày (USD)", "0.01"],
    ["monthly_budget_usd", "Ngân sách tháng (USD)", "0.01"],
    ["daily_token_limit", "Giới hạn token mỗi ngày", "1"],
    ["requests_per_minute", "Yêu cầu AI tối đa mỗi phút", "1"],
];

function SettingsForm({ settings, onSaved }) {
    const [form, setForm] = useState(settings);
    const [saving, setSaving] = useState(false);
    const update = (changes) => setForm((current) => ({ ...current, ...changes }));
    const priceModels = Array.from(new Set(
        [form.model, form.fallback_model, ...Object.keys(form.prices || {})].map((name) => name?.trim()).filter(Boolean)
    ));
    const setPrice = (model, field, value) => update({
        prices: { ...form.prices, [model]: { input: 0, cached: 0, output: 0, ...form.prices?.[model], [field]: value } },
    });

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            const numbers = Object.fromEntries(
                [...NUMBER_FIELDS.map(([key]) => key), "outfit_limit"].map((key) => [key, Number(form[key] || 0)])
            );
            const prices = Object.fromEntries(priceModels.map((model) => {
                const price = form.prices?.[model] || {};
                return [model, { input: Number(price.input || 0), cached: Number(price.cached || 0), output: Number(price.output || 0) }];
            }));
            await saveAiSettings({ ...form, ...numbers, prices });
            toast.success("Đã lưu cấu hình AI.");
            await onSaved();
        } catch (error) {
            console.error("Không thể lưu cấu hình AI:", error);
            toast.error(getErrorMessage(error, "Không thể lưu cấu hình AI."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <form className="ai-card ai-form" onSubmit={submit}>
            <h3>Giới hạn và cấu hình</h3>
            <label className="ai-check">
                <input type="checkbox" checked={form.enabled} onChange={(event) => update({ enabled: event.target.checked })} />
                Bật AI (tắt thì khách nhận bộ ghép theo bộ lọc, không tốn token)
            </label>
            <div className="ai-form-grid">
                <label>
                    Lượt tạo outfit mỗi IP
                    <input type="number" min="1" max="1000" required value={form.outfit_limit} onChange={(event) => update({ outfit_limit: event.target.value })} />
                </label>
                <label>
                    Chu kỳ tính lượt
                    <select value={form.outfit_limit_window} onChange={(event) => update({ outfit_limit_window: event.target.value })}>
                        <option value="day">Mỗi ngày (reset lúc 00:00)</option>
                        <option value="total">Tổng cộng, không tự reset</option>
                    </select>
                </label>
                {NUMBER_FIELDS.map(([key, label, step]) => (
                    <label key={key}>
                        {label}
                        <input type="number" min="0" step={step} required value={form[key]} onChange={(event) => update({ [key]: event.target.value })} />
                    </label>
                ))}
                <label>
                    Model chính
                    <input required maxLength={100} value={form.model} onChange={(event) => update({ model: event.target.value })} />
                </label>
                <label>
                    Model dự phòng
                    <input maxLength={100} value={form.fallback_model} onChange={(event) => update({ fallback_model: event.target.value })} />
                </label>
            </div>
            <p className="ai-note">Nhập 0 ở ngân sách, giới hạn token hoặc số yêu cầu mỗi phút nghĩa là không giới hạn. Các giới hạn áp dụng cho API key đang cấu hình trong server/.env.</p>

            <h4>Bảng giá (USD / 1 triệu token)</h4>
            <div className="ai-table-wrap">
                <table className="ai-table">
                    <thead><tr><th>Model</th><th>Input</th><th>Cached</th><th>Output</th></tr></thead>
                    <tbody>
                        {priceModels.map((model) => (
                            <tr key={model}>
                                <td>{model}</td>
                                {["input", "cached", "output"].map((field) => (
                                    <td key={field}>
                                        <input
                                            type="number" min="0" step="any"
                                            aria-label={`Giá ${field} của ${model}`}
                                            value={form.prices?.[model]?.[field] ?? ""}
                                            onChange={(event) => setPrice(model, field, event.target.value)}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button type="submit" className="ai-button primary" disabled={saving}>
                {saving ? "ĐANG LƯU..." : "LƯU CẤU HÌNH"}
            </button>
        </form>
    );
}

export default function AiCostTab({ data, onReload }) {
    const { overview, settings, spending } = data;
    const finops = overview.finops;
    const uncached = finops.prompt_tokens - finops.cached_tokens;

    const reset = async (ip) => {
        try {
            await resetAiQuota(ip);
            toast.success(`Đã đặt lại lượt cho ${ip}.`);
            await onReload();
        } catch (error) {
            console.error("Không thể đặt lại lượt:", error);
            toast.error(getErrorMessage(error, "Không thể đặt lại lượt."));
        }
    };

    return (
        <>
            <div className="ai-tiles">
                <StatTile label="Chi phí ước tính" value={formatUsd(finops.cost_usd)} hint={`${formatNumber(overview.requests)} lượt trong kỳ`} />
                <StatTile label="Input token (không cache)" value={formatCompact(uncached)} />
                <StatTile label="Cached token" value={formatCompact(finops.cached_tokens)} hint="Groq tính nửa giá" />
                <StatTile label="Output token" value={formatCompact(finops.completion_tokens)} hint={`Trong đó suy luận: ${formatCompact(finops.reasoning_tokens)}`} />
            </div>

            <div className="ai-card">
                <h3>Ngân sách đang dùng</h3>
                <Meter label="Chi phí hôm nay" used={spending.today_cost_usd} limit={settings.daily_budget_usd} format={formatUsd} />
                <Meter label="Chi phí tháng này" used={spending.month_cost_usd} limit={settings.monthly_budget_usd} format={formatUsd} />
                <Meter label="Token hôm nay" used={spending.today_tokens} limit={settings.daily_token_limit} format={formatNumber} />
                <Meter label="Yêu cầu trong 60 giây" used={data.requests_last_minute} limit={settings.requests_per_minute} format={formatNumber} />
                <p className="ai-note">Chạm giới hạn thì hệ thống tự ngừng gọi model và trả bộ ghép theo bộ lọc. Chi phí tính theo bảng giá bên dưới, không phải hóa đơn của Groq.</p>
            </div>

            <div className="ai-grid-2">
                <ColumnChart
                    title="Token theo ngày"
                    days={overview.daily}
                    format={formatCompact}
                    series={[
                        { key: "input_tokens", label: "Input" },
                        { key: "cached_tokens", label: "Cached" },
                        { key: "output_tokens", label: "Output" },
                    ]}
                />
                <ColumnChart title="Chi phí theo ngày" days={overview.daily} format={formatUsd} series={[{ key: "cost_usd", label: "Chi phí" }]} />
            </div>

            <div className="ai-grid-2">
                <div className="ai-card"><h3>Theo tính năng</h3><DataTable columns={groupColumns("Tính năng")} rows={finops.by_feature} /></div>
                <div className="ai-card"><h3>Theo model</h3><DataTable columns={groupColumns("Model")} rows={finops.by_model} /></div>
                <div className="ai-card"><h3>Theo nhóm người dùng</h3><DataTable columns={groupColumns("Nhóm")} rows={finops.by_role} /></div>
                <div className="ai-card"><h3>Người dùng tốn nhiều nhất</h3><DataTable columns={groupColumns("Người dùng")} rows={finops.by_user} /></div>
            </div>

            <div className="ai-card">
                <h3>Lượt tạo outfit theo IP ({settings.outfit_limit_window === "total" ? "tổng cộng" : "hôm nay"})</h3>
                <DataTable
                    empty="Chưa có máy nào dùng lượt."
                    rows={overview.quota}
                    columns={[
                        { label: "IP", render: (row) => row.ip },
                        { label: "Đã dùng", numeric: true, render: (row) => `${row.used}/${settings.outfit_limit}` },
                        { label: "Tài khoản", render: (row) => row.emails.join(", ") || "khách vãng lai" },
                        { label: "Lần cuối", render: (row) => formatTime(row.last_at) },
                        { label: "Thao tác", render: (row) => <button type="button" className="ai-button" onClick={() => reset(row.ip)}>ĐẶT LẠI</button> },
                    ]}
                />
            </div>

            {/* key theo lần cập nhật để form nhận giá trị mới sau khi lưu */}
            <SettingsForm key={settings.updated_at} settings={settings} onSaved={onReload} />
        </>
    );
}
