type ListRowProps = {
  title: string;
  detail?: string;
  value?: string;
};

export function ListRow({ title, detail, value }: ListRowProps) {
  return (
    <div className="border-line flex min-h-11 items-center gap-3 border-b py-2 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-ink truncate text-base">{title}</p>
        {detail ? <p className="text-muted text-sm">{detail}</p> : null}
      </div>
      {value ? (
        <p className="font-display text-2xl leading-none font-semibold tabular-nums">
          {value}
        </p>
      ) : null}
    </div>
  );
}
