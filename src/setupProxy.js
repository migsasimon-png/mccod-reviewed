const proxy = require("http-proxy-middleware");

/** Normalize PAT / Basic values from .env into a valid Authorization header. */
function buildAuthHeader(raw) {
  if (!raw) return null;
  const value = String(raw).replace(/^["']|["']$/g, "").trim();
  if (!value) return null;
  if (/^(Basic|ApiToken)\s/i.test(value)) return value;
  if (value.startsWith("d2p_")) return `ApiToken ${value}`;
  return value;
}

module.exports = function (app) {
  const target = (
    process.env.DHIS2_PROXY_TARGET ||
    process.env.REACT_APP_DHIS2_BASE_URL ||
    "https://hmis-tests.health.go.ug"
  ).replace(/\/$/, "");

  const authHeader = buildAuthHeader(process.env.REACT_APP_DHIS2_AUTHORIZATION);

  const proxyOptions = {
    target,
    changeOrigin: true,
    secure: true,
    logLevel: "warn",
    onProxyReq(proxyReq) {
      if (authHeader) {
        proxyReq.setHeader("Authorization", authHeader);
      }
    },
  };

  app.use("/api", proxy(proxyOptions));
  app.use("/dhis-web-commons", proxy(proxyOptions));

  console.log(
    `[dev-proxy] /api -> ${target}` +
      (authHeader ? " (Authorization injected)" : " (no Authorization set)")
  );
};
