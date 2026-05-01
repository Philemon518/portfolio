export function DesktopOnlyScreen() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        textAlign: 'center',
        background: 'radial-gradient(ellipse at center, #1a2030 0%, #07080c 70%)',
        zIndex: 10000,
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <h1 style={{ margin: '0 0 12px', fontSize: '1.35rem' }}>Desktop only</h1>
        <p style={{ margin: 0, color: '#b8c0d4', lineHeight: 1.55 }}>
          This portfolio experience is built for a mouse or trackpad and optional webcam hand
          control on a computer. Please open it on a laptop or desktop with a wider window.
        </p>
      </div>
    </div>
  )
}
