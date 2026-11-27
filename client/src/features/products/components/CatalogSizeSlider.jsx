// Một thanh kéo chọn size cho một nhóm (quần áo hoặc chân).
// Size đang chọn không thuộc nhóm này thì thanh trở về ALL.
export default function CatalogSizeSlider({ title, sizeNames, selectedSize, onSelect }) {
    const stops = ["", ...sizeNames];
    const selectedIndex = Math.max(0, stops.indexOf(selectedSize));

    return (
        <div className="catalog-size-slider">
            <span className="catalog-size-group-title">{title}</span>
            <input
                type="range"
                min="0"
                max={stops.length - 1}
                step="1"
                value={selectedIndex}
                aria-label={`Lọc theo ${title}`}
                aria-valuetext={stops[selectedIndex] || "Tất cả"}
                onChange={(event) => onSelect(stops[Number(event.target.value)])}
            />
            <div
                className="catalog-size-slider-labels"
                style={{ gridTemplateColumns: `repeat(${stops.length}, minmax(0, 1fr))` }}
            >
                {stops.map((size, index) => (
                    <button
                        key={size || "all"}
                        type="button"
                        className={index === selectedIndex ? "active" : ""}
                        onClick={() => onSelect(size)}
                    >
                        <span className="catalog-size-slider-tick" />
                        {size || "ALL"}
                    </button>
                ))}
            </div>
        </div>
    );
}
