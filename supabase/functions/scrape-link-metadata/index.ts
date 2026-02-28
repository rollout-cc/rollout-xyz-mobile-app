const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Lightweight: fetch HTML and parse meta tags directly (no JS rendering)
async function fetchMetaFromHtml(url: string) {
  const result: any = { success: true, title: null, description: null, image: null, favicon: null };
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MetaBot/1.0)' },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(t);
    const html = await res.text();

    const get = (pattern: RegExp) => {
      const m = html.match(pattern);
      return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim() : null;
    };

    result.title = get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      || get(/<title[^>]*>([^<]+)<\/title>/i);
    result.description = get(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
      || get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    result.image = get(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    result.favicon = get(/<link[^>]+rel=["']icon["'][^>]+href=["']([^"']+)["']/i);
  } catch (e) {
    console.log('HTML fetch failed:', e instanceof Error ? e.message : e);
  }
  return result;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Fetching metadata for:', formattedUrl);

    // Try lightweight HTML fetch first (fast, no external API needed)
    let result = await fetchMetaFromHtml(formattedUrl);

    // Fall back to Firecrawl only if HTML fetch didn't get a title
    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!result.title && apiKey) {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 8000);

        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: formattedUrl,
            formats: ['markdown'],
            onlyMainContent: false,
            waitFor: 1000,
            timeout: 10000,
          }),
          signal: controller.signal,
        });
        clearTimeout(t);

        if (response.ok) {
          const data = await response.json();
          const metadata = data?.data?.metadata || data?.metadata || {};
          result = {
            success: true,
            title: metadata.title || metadata.ogTitle || result.title,
            description: metadata.description || metadata.ogDescription || result.description,
            image: metadata.ogImage || metadata.image || result.image,
            favicon: metadata.favicon || result.favicon,
          };
        }
      } catch (e) {
        console.log('Firecrawl fallback skipped:', e instanceof Error ? e.message : e);
      }
    }

    console.log('Metadata result:', result);
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching metadata:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
