import { useState } from "react";
import { shortDate } from "../../utils/aiFormat";

export function StatTile({ label, value, hint }) {
    return (
        <div className="ai-tile">
            <span className="ai-tile-label">{label}</span>
            <strong className="ai-tile-value">{value}</strong>
            {hint && <span className="ai-tile-hint">{hint}</span>}
        </div>
    );
}

// Thanh mức dùng so với giới hạn: đổi màu khi từ 80% và 100%
export function Meter({ label, used, limit, format }) {
    const share = limit > 0 ? used / limit : 0;
    const level = share >= 1 ? "danger" : share >= 0.8 ? "warning" : "normal";
    return (
        <div className={`ai-meter ${level}`}>
            <div className="ai-meter-head">
                <span>{label}</span>
                <span>
                    {format(used)} / {limit > 0 ? format(limit) : "không giới hạn"}
                    {level === "danger" ? " — ĐÃ CHẠM GIỚI HẠN" : level === "warning" ? " — SẮP CHẠM" : ""}
                </span>
            </div>
            <div
                className="ai-meter-track"
                role="meter"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={limit || undefined}
                aria-valuenow={used}
            >
                <div className="ai-meter-fill" style={{ width: `${Math.min(100, share * 100)}%` }} />
            </div>
        </div>
    );
}

export function DataTable({ columns, rows, empty = "Chưa có dữ liệu.", onRowClick }) {
    if (rows.length === 0) return <p className="ai-empty">{empty}</p>;
    return (
        <div className="ai-table-wrap">
            <table className="ai-table">
                <thead>
                    <tr>{columns.map((column) => <th key={column.label} className={column.numeric ? "num" : ""}>{column.label}</th>)}</tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={row.id ?? row.key ?? row.ip ?? index}>
                            {columns.map((column, columnIndex) => (
                                <td key={column.label} className={column.numeric ? "num" : ""}>
                                    {onRowClick && columnIndex === 0 ? (
                                        <button type="button" className="ai-link" onClick={() => onRowClick(row)}>{column.render(row)}</button>
                                    ) : column.render(row)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Làm tròn lên mốc đẹp cho trục tung
function niceMax(value) {
    if (value <= 0) return 1;
    const power = 10 ** Math.floor(Math.log10(value));
    return [1, 2, 4, 5, 10].map((step) => step * power).find((step) => step >= value);
}

// Biểu đồ cột theo ngày. stacked = true: các chuỗi cộng dồn; false: đứng cạnh nhau.
export function ColumnChart({ title, days, series, format, stacked = true }) {
    const [active, setActive] = useState(null);
    const [asTable, setAsTable] = useState(false);
    const totalOf = (day) => (stacked
        ? series.reduce((sum, item) => sum + day[item.key], 0)
        : Math.max(...series.map((item) => day[item.key])));
    const max = niceMax(Math.max(0, ...days.map(totalOf)));
    const labelEvery = Math.ceil(days.length / 8);

    return (
        <figure className="ai-chart">
            <figcaption>
                <span>{title}</span>
                <button type="button" className="ai-link" onClick={() => setAsTable((value) => !value)}>
                    {asTable ? "Xem biểu đồ" : "Xem dạng bảng"}
                </button>
            </figcaption>
            {series.length > 1 && (
                <ul className="ai-legend">
                    {series.map((item, index) => (
                        <li key={item.key}><i className={`ai-series-${index + 1}`} />{item.label}</li>
                    ))}
                </ul>
            )}
            {asTable ? (
                <DataTable
                    columns={[
                        { label: "Ngày", render: (day) => shortDate(day.date) },
                        ...series.map((item) => ({ label: item.label, numeric: true, render: (day) => format(day[item.key]) })),
                    ]}
                    rows={days.map((day) => ({ ...day, id: day.date }))}
                />
            ) : (
                <div className="ai-plot">
                    <div className="ai-axis" aria-hidden="true">
                        <span>{format(max)}</span>
                        <span>{format(max / 2)}</span>
                        <span>0</span>
                    </div>
                    <div className="ai-columns" onMouseLeave={() => setActive(null)}>
                        {days.map((day, dayIndex) => (
                            <div
                                key={day.date}
                                className="ai-column"
                                tabIndex={0}
                                aria-label={`${shortDate(day.date)}: ${series.map((item) => `${item.label} ${format(day[item.key])}`).join(", ")}`}
                                onMouseEnter={() => setActive(dayIndex)}
                                onFocus={() => setActive(dayIndex)}
                                onBlur={() => setActive(null)}
                            >
                                <div className={`ai-bars${stacked ? " stacked" : ""}`}>
                                    {series.map((item, index) => day[item.key] > 0 && (
                                        <div
                                            key={item.key}
                                            className={`ai-bar ai-series-${index + 1}`}
                                            style={{ height: `${(day[item.key] / max) * 100}%` }}
                                        />
                                    ))}
                                </div>
                                <span className="ai-x">{(days.length - 1 - dayIndex) % labelEvery === 0 ? shortDate(day.date) : ""}</span>
                                {active === dayIndex && (
                                    <div className={`ai-tooltip${dayIndex > days.length / 2 ? " left" : ""}`}>
                                        <strong>{shortDate(day.date)}</strong>
                                        {series.map((item, index) => (
                                            <span key={item.key}><i className={`ai-series-${index + 1}`} />{item.label}: <b>{format(day[item.key])}</b></span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </figure>
    );
}
