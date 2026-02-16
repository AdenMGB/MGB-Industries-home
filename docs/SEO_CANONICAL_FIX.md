# Fix: "Duplicate, Google chose different canonical than user"

This document explains the changes made to fix the Google Search Console error.

## What was done

1. **301 redirects** – All www and HTTP traffic redirects to `https://adenmgb.com`:
   - `www.adenmgb.com` → `https://adenmgb.com`
   - `http://adenmgb.com` → `https://adenmgb.com`
   - `http://www.adenmgb.com` → `https://adenmgb.com`

2. **Client-side fallback** – In `index.html`, a script redirects `www.adenmgb.com` to the non-www URL if the server-level redirect is not in place.

3. **Platform configs**:
   - **Vercel**: `vercel.json` has a host-based redirect. Prefer **Dashboard → Project → Settings → Domains**: add both `adenmgb.com` and `www.adenmgb.com`, set `adenmgb.com` as primary.
   - **Netlify**: `netlify.toml` and `public/_redirects`
   - **Docker/nginx**: Handle at edge (Cloudflare, load balancer). The container serves all hosts; redirects can cause NS_ERROR_UNKNOWN_HOST when origin hostname differs from public domain.

## If you use Cloudflare

Add a Redirect Rule in **Cloudflare Dashboard → Rules → Redirect Rules**:

- **When**: Hostname equals `www.adenmgb.com`
- **Then**: Dynamic redirect to `https://adenmgb.com${uri.path}${uri.query_string}`, status 301

## Next steps in Search Console

1. Deploy these changes.
2. In [Search Console](https://search.google.com/search-console), open the affected URL.
3. Click **Request indexing** for `https://adenmgb.com/`.
4. Use **Validate fix** on the issue if available.
5. Allow 1–2 weeks for Google to recrawl and update.

## Reference

- [Google: Duplicate, Google chose different canonical than user](https://support.google.com/webmasters/answer/7440203#google_chose_different_canonical_than_user)
