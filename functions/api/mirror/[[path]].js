/* 同源镜像代理 · /api/mirror/<b64url>[/<相对路径>]
 * 供 /games/destroy/ 和 /games/katamari/ 的 ?url= 任意网页模式使用：
 * 浏览器禁止跨源读写 iframe 内容，这两个游戏必须把目标页"搬"成同源。
 *
 * 混合策略（改动最小、页面加载最快）：
 *   1. 注入 <base href="原页面地址"> —— 相对路径资源由浏览器直接向原站请求（无需重写）
 *   2. 只重写"绝对地址"（https?:// 和 //）为 /api/mirror/<b64> 走本代理
 *   3. 注入点击拦截脚本：iframe 内点链接改走镜像导航，游戏不丢 DOM 访问权
 *   4. 剥掉 X-Frame-Options / CSP frame-ancestors / COOP / COEP / CORP，允许被 iframe 嵌入
 *   5. 不转发访客 Cookie，不转发原站 Set-Cookie（原站拿不到访客任何凭据）
 * 安全：只接受 http/https；拒绝内网 / 回环 / 链路本地 / 元数据地址（防 SSRF）。
 */

const B64 = {
  enc(s) {
    return btoa(unescape(encodeURIComponent(s)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  dec(s) {
    try {
      let t = s.replace(/-/g, "+").replace(/_/g, "/");
      while (t.length % 4) t += "=";
      return decodeURIComponent(escape(atob(t)));
    } catch (e) {
      return null;
    }
  },
};

function assertSafe(u) {
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (!host) return false;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (host.startsWith("[")) return false; // IPv6 一律拦截
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const p = host.split(".").map(Number);
    if (p[0] === 127 || p[0] === 10 || p[0] === 0) return false;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return false;
    if (p[0] === 192 && p[1] === 168) return false;
    if (p[0] === 169 && p[1] === 254) return false;
    if (p[0] >= 224) return false;
  }
  return true;
}

// 绝对地址 → 镜像路径；相对路径 / data: / # 等原样返回（交给 <base>）
function fixUrl(u) {
  u = (u || "").trim();
  if (!u) return u;
  if (/^(data:|blob:|javascript:|mailto:|tel:|about:|#)/i.test(u)) return u;
  if (u.startsWith("/api/mirror/")) return u; // 已重写，幂等
  if (!/^https?:/i.test(u) && !u.startsWith("//")) return u;
  let abs;
  try { abs = new URL(u.startsWith("//") ? "https:" + u : u).href; } catch (e) { return u; }
  if (!assertSafe(new URL(abs))) return u;
  return "/api/mirror/" + B64.enc(abs);
}

function rewriteMarkup(html) {
  // 标签属性：src / href / action / poster / data
  html = html.replace(/(\b(?:src|href|action|poster|data)\s*=\s*)(["'])([^"']*?)\2/gi,
    (m, pre, q, u) => pre + q + fixUrl(u) + q);
  // srcset：逗号分段，逐段重写首段 URL
  html = html.replace(/(\bsrcset\s*=\s*)(["'])([^"']*?)\2/gi, (m, pre, q, v) => {
    const parts = v.split(",").map((seg) => {
      const t = seg.trim().split(/\s+/);
      if (t[0]) t[0] = fixUrl(t[0]);
      return t.join(" ");
    });
    return pre + q + parts.join(",") + q;
  });
  // CSS url()（含 <style> 块）
  html = html.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (m, q, u) => "url(" + q + fixUrl(u) + q + ")");
  // 内联 <script> 里的绝对地址也重写（SPA 常用 fetch/import）
  html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, code) => {
    return "<script" + attrs + ">" + rewriteJs(code) + "</script>";
  });
  return html;
}

function rewriteJs(code) {
  return code.replace(/(["'`])((?:https?:)?\/\/[^"'`\s\\]+)\1/g, (m, q, u) => {
    let abs;
    try { abs = new URL(u.startsWith("//") ? "https:" + u : u).href; } catch (e) { return m; }
    if (!assertSafe(new URL(abs))) return m;
    return q + "/api/mirror/" + B64.enc(abs) + q;
  });
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function injectShell(html, finalUrl) {
  html = html.replace(/<base\b[^>]*>/gi, ""); // 原页 base 作废，用我们的
  const base = '<base href="' + esc(finalUrl) + '">';
  if (/<head\b[^>]*>/i.test(html)) html = html.replace(/<head\b[^>]*>/i, (m) => m + base);
  else html = base + html;
  // 点击拦截：iframe 内点链接 → 改走镜像导航，游戏世界继续持有 DOM
  const nav =
    "<script>document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;" +
    "if(!a)return;var h=a.getAttribute('href')||'';" +
    "if(!h||h.charAt(0)==='#'||/^javascript:/i.test(h)||/^mailto:/i.test(h))return;" +
    "e.preventDefault();try{" +
    "var abs=new URL(h,document.baseURI).href;" +
    "location.href='/api/mirror/'+btoa(unescape(encodeURIComponent(abs))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');" +
    "}catch(x){}},true);</script>";
  if (/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, nav + "</body>");
  else html = html + nav;
  return html;
}

function cleanHeaders(up, passthrough) {
  const h = new Headers();
  up.headers.forEach((v, k) => {
    const lk = k.toLowerCase();
    if (lk === "set-cookie" ||
        lk === "x-frame-options" ||
        lk === "cross-origin-opener-policy" ||
        lk === "cross-origin-embedder-policy" ||
        lk === "cross-origin-resource-policy" ||
        lk === "content-security-policy-report-only" ||
        lk === "content-length") return;
    if (lk === "content-encoding" && !passthrough) return; // 重写后的 body 是解码文本
    if (lk === "content-security-policy") {
      const csp = v.replace(/frame-ancestors[^;]*;?/gi, "").trim();
      if (csp) h.set(k, csp);
      return;
    }
    h.set(k, v);
  });
  h.set("Cache-Control", "public, max-age=300");
  return h;
}

export async function onRequest(context) {
  const { request, params } = context;
  const segs = Array.isArray(params.path) ? params.path
    : (params.path ? params.path.split("/") : []);
  if (!segs.length) return new Response("usage: /api/mirror/<base64url>", { status: 400 });

  const base = B64.dec(segs[0]);
  if (!base || !/^https?:\/\//i.test(base)) return new Response("bad url", { status: 400 });
  let targetUrl;
  try {
    targetUrl = segs.length > 1 ? new URL(segs.slice(1).join("/"), base) : new URL(base);
  } catch (e) {
    return new Response("bad url", { status: 400 });
  }
  if (!assertSafe(targetUrl)) return new Response("blocked", { status: 403 });

  const cacheKey = new URL(request.url).href;
  if (request.method === "GET") {
    const hit = await caches.default.match(cacheKey);
    if (hit) return hit;
  }

  const upstream = await fetch(targetUrl.href, {
    method: "GET",
    redirect: "follow",
    headers: {
      "user-agent": request.headers.get("user-agent") || "Mozilla/5.0",
      "accept": request.headers.get("accept") || "*/*",
      "accept-language": request.headers.get("accept-language") || "",
    },
  });

  const ct = (upstream.headers.get("content-type") || "").toLowerCase();
  const finalUrl = upstream.url; // 重定向后的真实地址（base href 用它）
  let response;

  if (ct.includes("text/html") || ct.includes("application/xhtml")) {
    const text = await upstream.text();
    if (text.length > 5 * 1024 * 1024) {
      response = new Response("page too large", { status: 413 });
    } else {
      response = new Response(injectShell(rewriteMarkup(text), finalUrl),
        { status: upstream.status, headers: cleanHeaders(upstream, false) });
    }
  } else if (ct.includes("javascript") || ct.includes("ecmascript")) {
    const code = await upstream.text();
    response = new Response(rewriteJs(code),
      { status: upstream.status, headers: cleanHeaders(upstream, false) });
  } else if (ct.includes("text/css")) {
    const css = await upstream.text();
    response = new Response(rewriteMarkup(css),
      { status: upstream.status, headers: cleanHeaders(upstream, false) });
  } else {
    // 图片/字体/视频等二进制：流式透传
    response = new Response(upstream.body,
      { status: upstream.status, headers: cleanHeaders(upstream, true) });
  }

  if (response.status === 200 && request.method === "GET") {
    context.waitUntil(caches.default.put(cacheKey, response.clone()));
  }
  return response;
}
