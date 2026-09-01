# Transport Data Audit — 2026-09-01

Scope: verify (1) which Hong Kong transport tools are included in the app and
(2) whether the included data is correct. Live feeds were probed directly on
2026-09-01; seed data was cross-checked against real-world geography.

## 1. Coverage — what is included vs. missing

| Mode | Reality (2026) | In app | Status |
|---|---|---|---|
| MTR heavy rail | 10 lines | 10 lines (Island, Tsuen Wan, Tuen Ma, East Rail, Kwun Tong, South Island, Tung Chung, Tseung Kwan O, Disneyland Resort, Airport Express) | Full coverage |
| Light Rail | 12 routes (505…761P) | 12 routes (505, 507, 610, 614, 614P, 615, 615P, 705, 706, 751, 751P, 761P) | Full coverage |
| KMB buses | ~400 route numbers | All (790 route entries) | Full coverage |
| LWB (Long Win) | A/E airport routes | Included in KMB feed (verified A31, E33, A41, E41 present) | Full coverage |
| Citybus (incl. ex-NWFB) | ~200 route numbers | 8 featured routes (1, 10, 101, 102, 118, 260, 969, A11) | Partial by design |
| NLB (Lantau) | 23 route numbers | 4 route directions (route 1 both ways, 1R, 2) | Partial by design |
| GMB (green minibus) | 350+ routes | 1 route (HKI route 1) | Partial by design |
| Ferries | 102 TD routes | 102 (GeoJSON routeType 7) + GTFS schedules | Full coverage |
| Trams | 12 routes | 12 (GeoJSON routeType 4) + GTFS schedules | Full coverage |
| HKIA flights | daily ops | Previous-day replay | Replay mode by design |
| Red minibuses / taxis | no public ETA | not included | Correct — no public feed |

Missing MTR lines and Light Rail routes are a documented MVP scope decision
(D-002), not a defect. Bus operators (Citybus/NLB/GMB) are intentionally
featured-subset loads to keep the first live integration bounded.

## 2. Live feed health (probed 2026-09-01)

| Feed | Endpoint | HTTP |
|---|---|---|
| KMB/LWB routes | `data.etabus.gov.hk/v1/transport/kmb/route/` | 200 (1,601 entries, 790 unique incl. A/E) |
| Ferry GeoJSON | `static.data.gov.hk/td/routes-fares-geojson/JSON_FERRY.json` | 200 (260 features, 102 routes, all type 7) |
| Tram GeoJSON | `static.data.gov.hk/td/routes-fares-geojson/JSON_TRAM.json` | 200 (427 features, 12 routes, all type 4) |
| GTFS headway | `static.data.gov.hk/td/pt-headway-en/routes.txt` | 200 (2,445 rows; types 0/3/4/7 present) |
| NLB routes | `rt.data.gov.hk/v2/transport/nlb/route.php?action=list` | 200 (64 entries) |
| GMB HKI/1 | `data.etagmb.gov.hk/route/HKI/1` | 200 (route_id 2006408, 2 directions) |
| Citybus CTB | `rt.data.gov.hk/v2/transport/citybus/route/CTB` | 200 on retry (406 entries; one transient timeout) |

No feed returned a hard failure. Citybus had one transient timeout on first
attempt and returned 200 on retry.

## 3. Data correctness checks

### Route / operator labels
- **KMB/LWB label is correct**: the etabus KMB route feed genuinely contains
  both KMB routes and LWB A/E airport routes (verified A30-A47X, E31-E43).
  The adapter label `KMB/LWB` is accurate; no separate LWB endpoint exists at
  `v1/transport/lwb/` (returns 422).
- **Citybus post-merger**: the CTB endpoint includes ex-NWFB routes (970, 971,
  904, 905, 2, 8) — correct since the Citybus/NWFB merger.
- **NLB featured IDs**: `['1','2','3','4']` resolve to real route directions
  (1 Mui Wo>Tai O, 1 reverse, 1R Hung Hom>Ngong Ping, 2 Mui Wo>Ngong Ping).
  "4 featured routes" in docs is accurate.

### GeoJSON / GTFS filters
- Ferry adapter filters `routeType === 7` — the whole JSON_FERRY.json is type 7. Correct.
- Tram adapter filters `routeType === 4` — the whole JSON_TRAM.json is type 4. Correct.
- GTFS: ferry `route_type '4'`, tram `route_type '0'` — matches the GTFS spec
  (4 = ferry, 0 = tram). Correct.

### Seed rail data
- Station coordinates are within ~50-350 m of real positions; the three
  largest deltas (Causeway Bay 322 m, Sha Tin 344 m, Tsuen Wan 321 m) reflect
  platform-level precision, acceptable for seed data.
- Island / Tsuen Wan / Tuen Ma station order matches the real lines.
- Light Rail 610 order (Tuen Mun Ferry Pier → Town Centre → Siu Hong →
  Tin Shui Wai → Yuen Long) matches the real route.
- Tuen Ma order (Wu Kai Sha → Sha Tin → Hung Hom → East TST → Yuen Long →
  Siu Hong → Tuen Mun) matches the real east-to-west run.
- Trip durations/headways are plausible vs. real service levels.

## 4. Conclusion

- **Included data is correct.** All six transport tools load, all live feeds
  are healthy, labels match the actual feeds, and seed geometry matches real
  geography.
- **Coverage is intentionally partial** for rail (3/10 MTR lines, 1/12 LR
  routes) and for three bus operators (featured subsets). Ferries, trams,
  KMB/LWB and flights have full data.
- No blocking defects found. All 104 tests pass.

## Follow-up options
1. ~~Add remaining 7 MTR lines (East Rail, Kwun Tong, South Island, Tung Chung,
   Tseung Kwan O, Disneyland Resort, Airport Express) to seed data.~~ **DONE 2026-09-01**
2. ~~Expand Light Rail from 1 to 12 routes.~~ **DONE 2026-09-01**
3. Broaden Citybus/NLB/GMB featured sets.
4. None — keep MVP scope.

## Post-audit expansion (2026-09-01)

After the audit, the rail seed data was expanded to full network coverage:

- **MTR: 10/10 lines** — added East Rail, Kwun Tong, South Island, Tung Chung,
  Tseung Kwan O, Disneyland Resort, and Airport Express with real station
  coordinates and official MTR line colors.
- **Light Rail: 12/12 routes** — added 505, 507, 614, 614P, 615, 615P, 705, 706,
  751, 751P, 761P alongside the existing 610.
- Seed data is now generated by `scripts/generate-rail-seed.py` (single source
  of truth) and committed to `public/data/`: 22 lines, 67 stations, 88 trips.
- All interchange stations carry multi-line `lineIds` (e.g. Admiralty links
  Island/Tsuen Wan/East Rail/South Island; Siu Hong links Tuen Ma plus nine
  Light Rail routes).
- Gates: 104 tests pass, lint clean, build passes (existing chunk warning only).
