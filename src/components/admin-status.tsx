export function AdminStatus({ error, saved }: { error?: string; saved?: string }) {
  if (error) {
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    );
  }
  if (saved) {
    return (
      <p className="form-success" role="status">
        Kaydedildi.
      </p>
    );
  }
  return null;
}
