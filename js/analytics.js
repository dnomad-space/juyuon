(function () {
  'use strict';
  if (window.__juyuonAnalyticsInitialized) return;
  window.__juyuonAnalyticsInitialized = true;
  const id = 'G-DS93VNJFRN';
  const production = location.hostname === 'dnomad-space.github.io';
  const disabled = !production || navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  const events = new Set(['briefing_view', 'fuel_select', 'volume_select', 'forecast_view', 'comparison_calculate', 'download_page_open', 'store_link_click', 'guide_open', 'data_source_open', 'web_data_error', 'click_contact', 'click_privacy_policy']);
  const parameterNames = new Set(['fuel_type', 'volume_bucket', 'horizon_days', 'data_state', 'platform', 'source', 'result_bucket', 'reason']);
  window.juyuonTrack = function (event, params) {
    if (disabled || !events.has(event)) return;
    const safe = {};
    Object.entries(params || {}).forEach(([key, value]) => {
      if (parameterNames.has(key) && ['string', 'number', 'boolean'].includes(typeof value)) safe[key] = typeof value === 'string' ? value.slice(0, 60) : value;
    });
    window.gtag('event', event, safe);
  };
  if (!disabled) {
    window.gtag('js', new Date());
    const referrer = (() => { try { return document.referrer ? new URL(document.referrer).origin + '/' : ''; } catch { return ''; } })();
    window.gtag('config', id, {
      page_location: location.origin + location.pathname,
      page_referrer: referrer,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(script);
  }
  document.addEventListener('click', function (event) {
    const link = event.target.closest && event.target.closest('[data-analytics-event]');
    if (!link) return;
    window.juyuonTrack(link.dataset.analyticsEvent, { platform: link.dataset.platform, source: link.dataset.source });
  });
}());
