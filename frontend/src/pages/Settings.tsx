const Settings = () => (
  <div className="max-w-xl space-y-4">
    <h1 className="text-2xl font-semibold">Settings</h1>
    <p className="text-sm opacity-80">
      Configure <code className="text-xs bg-black/5 px-1 rounded">VITE_BACKEND_URL</code>,{' '}
      <code className="text-xs bg-black/5 px-1 rounded">CORS_ORIGINS</code>, and{' '}
      <code className="text-xs bg-black/5 px-1 rounded">FRONTEND_PUBLIC_URL</code> on the API for QR links and
      WebSocket URLs.
    </p>
    <p className="text-sm opacity-80">
      Default GST-style tax on new orders is 5% (editable at billing). Multi-branch records use the{' '}
      <code className="text-xs bg-black/5 px-1 rounded">branches</code> table.
    </p>
  </div>
)

export default Settings
