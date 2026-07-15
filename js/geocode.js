/*
 * AquaTrack — address geocoding via OpenStreetMap Nominatim (free, no key).
 * Please respect their usage policy: max ~1 request/second, so bulk
 * geocoding waits between lookups.
 */
window.AA = window.AA || {};

AA.geocode = {
  /* Resolve an address string to { lat, lng, display } or null */
  lookup: function (query) {
    var url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(query);
    return fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('Geocoder returned ' + r.status);
        return r.json();
      })
      .then(function (arr) {
        if (!arr || !arr.length) return null;
        return { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon), display: arr[0].display_name };
      });
  },

  /* Geocode every site that has an address but no coordinates yet.
   * onProgress(done, total, site) is called after each lookup. */
  fillMissing: function (onProgress) {
    var pending = AA.store.data.sites.filter(function (s) {
      return (s.lat == null || s.lng == null) && AA.store.addressString(s);
    });
    var total = pending.length;
    var done = 0;

    function next() {
      if (!pending.length) return Promise.resolve(done);
      var site = pending.shift();
      return AA.geocode.lookup(AA.store.addressString(site))
        .then(function (res) {
          if (res) {
            AA.store.updateSite(site.id, { lat: res.lat, lng: res.lng });
          }
          done++;
          if (onProgress) onProgress(done, total, site, !!res);
        })
        .catch(function () {
          done++;
          if (onProgress) onProgress(done, total, site, false);
        })
        .then(function () {
          /* stay under Nominatim's 1 req/s policy */
          return new Promise(function (ok) { setTimeout(ok, 1100); }).then(next);
        });
    }

    return next().then(function () { return { done: done, total: total }; });
  }
};
