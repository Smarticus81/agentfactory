export async function GET() {
  const js = `(() => {
    const SCRIPT = document.currentScript;
    const agentId = SCRIPT?.dataset?.agentId;
    const appOrigin = new URL(SCRIPT.src).origin;
    if (!agentId) { console.warn('[AgentEmbed] Missing data-agent-id'); return; }

    // Styles
    const style = document.createElement('style');
    style.textContent = \`
      .agent-fab{position:fixed;bottom:20px;right:20px;width:56px;height:56px;border-radius:9999px;background:#3b82f6;box-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -2px rgba(0,0,0,.05);z-index:999999;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer}
      .agent-iframe{position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:999998;background:transparent;display:none}
      .agent-iframe.open{display:block}
    \`;
    document.head.appendChild(style);

    // FAB
    const fab = document.createElement('button');
    fab.className = 'agent-fab';
    fab.innerHTML = '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>';

    // Iframe
    const iframe = document.createElement('iframe');
    iframe.className = 'agent-iframe';
    iframe.allow = 'microphone; autoplay';
    iframe.src = appOrigin + '/a/' + agentId + '?embed=1';

    fab.addEventListener('click', () => {
      iframe.classList.toggle('open');
    });

    document.body.appendChild(iframe);
    document.body.appendChild(fab);
  })();`;

  return new Response(js, { status: 200, headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=600' } });
}
