export function Card({
  title,
  actions,
  children,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      {title || actions ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.75rem",
          }}
        >
          {typeof title === "string" ? <h3 style={{ margin: 0 }}>{title}</h3> : title}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}
