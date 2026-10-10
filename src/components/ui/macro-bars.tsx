type MacroBarItem = {
  label: string;
  value: string;
  ratio: number;
  prominent?: boolean;
};

type MacroBarsProps = {
  items: MacroBarItem[];
};

export function MacroBars({ items }: MacroBarsProps) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const width = `${Math.min(100, Math.max(0, item.ratio * 100))}%`;
        return (
          <div key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span
                className={
                  item.prominent
                    ? "text-ink text-base font-medium"
                    : "text-muted text-sm"
                }
              >
                {item.label}
              </span>
              <span className="font-display text-xl leading-none font-semibold tabular-nums">
                {item.value}
              </span>
            </div>
            <div
              className={`bg-track overflow-hidden rounded-full ${item.prominent ? "h-2.5" : "h-1.5"}`}
            >
              <div
                className={`h-full rounded-full ${item.prominent ? "bg-food" : "bg-muted"}`}
                style={{ width }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
