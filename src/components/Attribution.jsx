export default function Attribution({ groundingMetadata }) {
  if (!groundingMetadata) return null;

  const { groundingChunks, searchEntryPoint } = groundingMetadata;

  // Filter maps chunks (Google Maps grounding links) and deduplicate by URI
  const rawMapsChunks = groundingChunks?.filter(chunk => chunk.maps) || [];
  const mapsChunks = [];
  const seenMapsUris = new Set();
  for (const chunk of rawMapsChunks) {
    if (chunk.maps.uri && !seenMapsUris.has(chunk.maps.uri)) {
      seenMapsUris.add(chunk.maps.uri);
      mapsChunks.push(chunk);
    }
  }

  // Filter web chunks (Google Search grounding links) and deduplicate by URI
  const rawWebChunks = groundingChunks?.filter(chunk => chunk.web) || [];
  const webChunks = [];
  const seenWebUris = new Set();
  for (const chunk of rawWebChunks) {
    if (chunk.web.uri && !seenWebUris.has(chunk.web.uri)) {
      seenWebUris.add(chunk.web.uri);
      webChunks.push(chunk);
    }
  }

  const hasMaps = mapsChunks.length > 0;
  const hasSearch = !!searchEntryPoint?.renderedContent || webChunks.length > 0;

  if (!hasMaps && !hasSearch) return null;

  return (
    <div className="maps-attribution-container">
      {/* 1. Search Grounding Attribution (Google Search Entry Point) */}
      {searchEntryPoint?.renderedContent && (
        <div 
          className="search-grounding-entrypoint"
          style={{
            fontSize: '12px',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            padding: '4px 0',
            borderBottom: hasMaps ? '1px solid var(--border-muted)' : 'none',
            paddingBottom: hasMaps ? '8px' : '0'
          }}
          dangerouslySetInnerHTML={{ __html: searchEntryPoint.renderedContent }}
        />
      )}

      {/* 2. Web citations list if search entry point isn't rendering them */}
      {!searchEntryPoint?.renderedContent && webChunks.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderBottom: hasMaps ? '1px solid var(--border-muted)' : 'none', paddingBottom: hasMaps ? '8px' : '0' }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            Search Sources
          </div>
          <div className="maps-attribution-links">
            {webChunks.map((chunk, idx) => (
              <a
                key={idx}
                href={chunk.web.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="maps-attribution-link"
                style={{ fontSize: '11px' }}
              >
                {chunk.web.title || `Web Source #${idx + 1}`}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 3. Maps Grounding Attribution */}
      {hasMaps && (
        <div className="flex-col gap-sm" style={{ paddingTop: '2px' }}>
          {/* Active Disclosure for Maps Grounding */}
          <div className="maps-attribution-disclaimer" style={{ fontFamily: 'Roboto, var(--font-sans)', fontWeight: 400 }}>
            AI-generated content may include information from Google Maps.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Verified Places
            </div>
            <div className="maps-attribution-links">
              {mapsChunks.map((chunk, idx) => (
                <a
                  key={idx}
                  href={chunk.maps.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="maps-attribution-link"
                  translate="no"
                  style={{
                    fontFamily: 'Roboto, var(--font-sans)',
                    fontWeight: 400,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {chunk.maps.title} (Google Maps)
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
