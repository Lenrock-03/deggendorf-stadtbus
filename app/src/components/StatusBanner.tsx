export function LoadingBanner() {
  return <p className="muted">Fahrplandaten werden geladen …</p>;
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="card" role="alert">
      <strong>Fahrplandaten konnten nicht geladen werden.</strong>
      <p className="muted">{message}</p>
    </div>
  );
}
