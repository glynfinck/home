import "server-only";

/**
 * Request context attached to a logged download.
 *
 * `country` comes from Vercel's edge geo-IP header, so it is null in local
 * dev and anywhere the IP can't be resolved. `referrer` is usually one of our
 * own pages (which page the download was started from); an external value
 * means someone deep-linked the file.
 */
export function downloadContext(headers: Headers) {
  // `undefined` rather than `null`: both RPC parameters default to null, and
  // the generated argument types are optional, so a missing header is passed
  // by simply omitting it.
  return {
    referrer: headers.get("referer") ?? undefined,
    country: headers.get("x-vercel-ip-country") ?? undefined,
  };
}
