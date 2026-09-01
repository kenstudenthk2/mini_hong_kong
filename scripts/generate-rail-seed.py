#!/usr/bin/env python3
"""Generate expanded Mini Hong Kong rail seed data.

Emits public/data/rail-lines.json, stations.json, trips-weekday.json,
trips-weekend.json with:
- all 10 MTR heavy rail lines
- all 12 Light Rail routes
- real station coordinates, official MTR line colors
- referential integrity (line <-> station <-> trip)
"""

import json
import os
import sys

# ---------------------------------------------------------------- stations
# id: (nameEn, nameZh, namePt, lon, lat)
S = {
    # --- Island Line
    'kennedy-town': ('Kennedy Town', '堅尼地城', 'Kennedy Town', 114.1281, 22.2810),
    'central': ('Central', '中環', 'Central', 114.1581, 22.2819),
    'admiralty': ('Admiralty', '金鐘', 'Admiralty', 114.1646, 22.2796),
    'causeway-bay': ('Causeway Bay', '銅鑼灣', 'Causeway Bay', 114.1869, 22.2803),
    'quarry-bay': ('Quarry Bay', '鰂魚涌', 'Quarry Bay', 114.2124, 22.2887),
    'chai-wan': ('Chai Wan', '柴灣', 'Chai Wan', 114.2371, 22.2647),
    # --- Tsuen Wan Line
    'tsim-sha-tsui': ('Tsim Sha Tsui', '尖沙咀', 'Tsim Sha Tsui', 114.1722, 22.2973),
    'mong-kok': ('Mong Kok', '旺角', 'Mong Kok', 114.1694, 22.3193),
    'lai-king': ('Lai King', '荔景', 'Lai King', 114.1266, 22.3481),
    'tsuen-wan': ('Tsuen Wan', '荃灣', 'Tsuen Wan', 114.1161, 22.3730),
    # --- Tuen Ma Line
    'wu-kai-sha': ('Wu Kai Sha', '烏溪沙', 'Wu Kai Sha', 114.2435, 22.4292),
    'sha-tin': ('Sha Tin', '沙田', 'Sha Tin', 114.1915, 22.3828),
    'hung-hom': ('Hung Hom', '紅磡', 'Hung Hom', 114.1822, 22.3032),
    'east-tsim-sha-tsui': ('East Tsim Sha Tsui', '尖東', 'East Tsim Sha Tsui', 114.1750, 22.2959),
    'yuen-long': ('Yuen Long', '元朗', 'Yuen Long', 114.0349, 22.4460),
    'siu-hong': ('Siu Hong', '兆康', 'Siu Hong', 113.9788, 22.4119),
    'tuen-mun': ('Tuen Mun', '屯門', 'Tuen Mun', 113.9739, 22.3953),
    # --- East Rail Line
    'exhibition-centre': ('Exhibition Centre', '會展', 'Exhibition Centre', 114.1775, 22.2847),
    'mong-kok-east': ('Mong Kok East', '旺角東', 'Mong Kok East', 114.1715, 22.3206),
    'kowloon-tong': ('Kowloon Tong', '九龍塘', 'Kowloon Tong', 114.1743, 22.3380),
    'tai-wai': ('Tai Wai', '大圍', 'Tai Wai', 114.1790, 22.3690),
    'university': ('University', '大學', 'University', 114.2106, 22.4136),
    'tai-po-market': ('Tai Po Market', '大埔墟', 'Tai Po Market', 114.1696, 22.4451),
    'fanling': ('Fanling', '粉嶺', 'Fanling', 114.1378, 22.4925),
    'sheung-shui': ('Sheung Shui', '上水', 'Sheung Shui', 114.1280, 22.5043),
    'lo-wu': ('Lo Wu', '羅湖', 'Lo Wu', 114.1145, 22.5036),
    # --- Kwun Tong Line
    'whampoa': ('Whampoa', '黃埔', 'Whampoa', 114.1862, 22.3047),
    'ho-man-tin': ('Ho Man Tin', '何文田', 'Ho Man Tin', 114.1817, 22.3094),
    'yau-ma-tei': ('Yau Ma Tei', '油麻地', 'Yau Ma Tei', 114.1711, 22.3112),
    'prince-edward': ('Prince Edward', '太子', 'Prince Edward', 114.1680, 22.3250),
    'shek-kip-mei': ('Shek Kip Mei', '石硤尾', 'Shek Kip Mei', 114.1650, 22.3302),
    'lok-fu': ('Lok Fu', '樂富', 'Lok Fu', 114.1840, 22.3365),
    'wong-tai-sin': ('Wong Tai Sin', '黃大仙', 'Wong Tai Sin', 114.1925, 22.3426),
    'diamond-hill': ('Diamond Hill', '鑽石山', 'Diamond Hill', 114.2020, 22.3424),
    'choi-hung': ('Choi Hung', '彩虹', 'Choi Hung', 114.2094, 22.3337),
    'kowloon-bay': ('Kowloon Bay', '九龍灣', 'Kowloon Bay', 114.2150, 22.3240),
    'ngau-tau-kok': ('Ngau Tau Kok', '牛頭角', 'Ngau Tau Kok', 114.2183, 22.3170),
    'kwun-tong': ('Kwun Tong', '觀塘', 'Kwun Tong', 114.2260, 22.3117),
    'lam-tin': ('Lam Tin', '藍田', 'Lam Tin', 114.2345, 22.3113),
    'yau-tong': ('Yau Tong', '油塘', 'Yau Tong', 114.2358, 22.2968),
    'tiu-keng-leng': ('Tiu Keng Leng', '調景嶺', 'Tiu Keng Leng', 114.2520, 22.3040),
    # --- South Island Line
    'ocean-park': ('Ocean Park', '海洋公園', 'Ocean Park', 114.1750, 22.2466),
    'wong-chuk-hang': ('Wong Chuk Hang', '黃竹坑', 'Wong Chuk Hang', 114.1759, 22.2480),
    'lei-tung': ('Lei Tung', '利東', 'Lei Tung', 114.1780, 22.2405),
    'south-horizons': ('South Horizons', '海怡半島', 'South Horizons', 114.1770, 22.2410),
    # --- Tung Chung Line / Airport Express
    'hong-kong': ('Hong Kong', '香港', 'Hong Kong', 114.1652, 22.2850),
    'kowloon': ('Kowloon', '九龍', 'Kowloon', 114.1655, 22.3065),
    'olympic': ('Olympic', '奧運', 'Olympic', 114.1600, 22.3172),
    'nam-cheong': ('Nam Cheong', '南昌', 'Nam Cheong', 114.1520, 22.3260),
    'tsing-yi': ('Tsing Yi', '青衣', 'Tsing Yi', 114.1025, 22.3550),
    'sunny-bay': ('Sunny Bay', '欣澳', 'Sunny Bay', 114.0430, 22.3290),
    'tung-chung': ('Tung Chung', '東涌', 'Tung Chung', 113.9420, 22.2890),
    'airport': ('Airport', '機場', 'Aeroporto', 113.9357, 22.3086),
    'asiaworld-expo': ('AsiaWorld-Expo', '博覽館', 'AsiaWorld-Expo', 113.9410, 22.3210),
    # --- Tseung Kwan O Line
    'north-point': ('North Point', '北角', 'North Point', 114.2009, 22.2876),
    'tseung-kwan-o': ('Tseung Kwan O', '將軍澳', 'Tseung Kwan O', 114.2586, 22.3069),
    'hang-hau': ('Hang Hau', '坑口', 'Hang Hau', 114.2620, 22.3140),
    'po-lam': ('Po Lam', '寶琳', 'Po Lam', 114.2560, 22.3220),
    # --- Disneyland Resort Line
    'disneyland-resort': ('Disneyland Resort', '迪士尼', 'Disneyland Resort', 114.0400, 22.3125),
    # --- Light Rail
    'tuen-mun-ferry-pier': ('Tuen Mun Ferry Pier', '屯門碼頭', 'Cais de Ferry de Tuen Mun', 113.9663, 22.3718),
    'town-centre': ('Town Centre', '市中心', 'Centro da Cidade', 113.9766, 22.3934),
    'tin-shui-wai': ('Tin Shui Wai', '天水圍', 'Tin Shui Wai', 114.0016, 22.4605),
    'sam-shing': ('Sam Shing', '三聖', 'Sam Shing', 113.9722, 22.3844),
    'on-ting': ('On Ting', '安定', 'On Ting', 113.9747, 22.3870),
    'yau-oi': ('Yau Oi', '友愛', 'Yau Oi', 113.9735, 22.3805),
    'tin-wing': ('Tin Wing', '天榮', 'Tin Wing', 114.0075, 22.4575),
    'tin-yat': ('Tin Yat', '天逸', 'Tin Yat', 114.0060, 22.4620),
}

# ---------------------------------------------------------------- lines
# id: (mode, nameEn, nameZh, namePt, color, operator, [stationIds])
L = {
    'island': ('mtr', 'Island Line', '港島綫', 'Linha da Ilha', '#007dc5', 'MTR',
               ['kennedy-town', 'central', 'admiralty', 'causeway-bay', 'quarry-bay', 'chai-wan']),
    'tsuen-wan': ('mtr', 'Tsuen Wan Line', '荃灣綫', 'Linha Tsuen Wan', '#e2231a', 'MTR',
                  ['central', 'admiralty', 'tsim-sha-tsui', 'mong-kok', 'lai-king', 'tsuen-wan']),
    'tuen-ma': ('mtr', 'Tuen Ma Line', '屯馬綫', 'Linha Tuen Ma', '#9a3b26', 'MTR',
                ['wu-kai-sha', 'sha-tin', 'hung-hom', 'east-tsim-sha-tsui', 'yuen-long', 'siu-hong', 'tuen-mun']),
    'east-rail': ('mtr', 'East Rail Line', '東鐵綫', 'Linha East Rail', '#54b7e8', 'MTR',
                  ['admiralty', 'exhibition-centre', 'hung-hom', 'mong-kok-east', 'kowloon-tong',
                   'tai-wai', 'sha-tin', 'university', 'tai-po-market', 'fanling', 'sheung-shui', 'lo-wu']),
    'kwun-tong': ('mtr', 'Kwun Tong Line', '觀塘綫', 'Linha Kwun Tong', '#00a4a7', 'MTR',
                  ['whampoa', 'ho-man-tin', 'yau-ma-tei', 'mong-kok', 'prince-edward', 'shek-kip-mei',
                   'kowloon-tong', 'lok-fu', 'wong-tai-sin', 'diamond-hill', 'choi-hung', 'kowloon-bay',
                   'ngau-tau-kok', 'kwun-tong', 'lam-tin', 'yau-tong', 'tiu-keng-leng']),
    'south-island': ('mtr', 'South Island Line', '南港島綫', 'Linha da Ilha do Sul', '#b5bd00', 'MTR',
                     ['admiralty', 'ocean-park', 'wong-chuk-hang', 'lei-tung', 'south-horizons']),
    'tung-chung': ('mtr', 'Tung Chung Line', '東涌綫', 'Linha Tung Chung', '#f38b00', 'MTR',
                   ['hong-kong', 'kowloon', 'olympic', 'nam-cheong', 'lai-king', 'tsing-yi', 'sunny-bay', 'tung-chung']),
    'tseung-kwan-o': ('mtr', 'Tseung Kwan O Line', '將軍澳綫', 'Linha Tseung Kwan O', '#7b3f97', 'MTR',
                      ['north-point', 'quarry-bay', 'yau-tong', 'tiu-keng-leng', 'tseung-kwan-o', 'hang-hau', 'po-lam']),
    'disneyland-resort': ('mtr', 'Disneyland Resort Line', '迪士尼綫', 'Linha Disneyland Resort', '#f5009a', 'MTR',
                          ['sunny-bay', 'disneyland-resort']),
    'airport-express': ('mtr', 'Airport Express', '機場快綫', 'Expresso do Aeroporto', '#00888f', 'MTR',
                        ['hong-kong', 'kowloon', 'tsing-yi', 'airport', 'asiaworld-expo']),
    # --- Light Rail
    'light-rail-505': ('light_rail', 'Light Rail 505', '輕鐵 505', 'Metro Ligeiro 505', '#f6a800', 'MTR Light Rail',
                       ['sam-shing', 'town-centre', 'siu-hong']),
    'light-rail-507': ('light_rail', 'Light Rail 507', '輕鐵 507', 'Metro Ligeiro 507', '#f6a800', 'MTR Light Rail',
                       ['tuen-mun-ferry-pier', 'town-centre', 'siu-hong']),
    'light-rail-610': ('light_rail', 'Light Rail 610', '輕鐵 610', 'Metro Ligeiro 610', '#f6a800', 'MTR Light Rail',
                       ['tuen-mun-ferry-pier', 'town-centre', 'siu-hong', 'tin-shui-wai', 'yuen-long']),
    'light-rail-614': ('light_rail', 'Light Rail 614', '輕鐵 614', 'Metro Ligeiro 614', '#f6a800', 'MTR Light Rail',
                       ['tuen-mun-ferry-pier', 'on-ting', 'town-centre', 'siu-hong', 'tin-shui-wai', 'yuen-long']),
    'light-rail-614p': ('light_rail', 'Light Rail 614P', '輕鐵 614P', 'Metro Ligeiro 614P', '#f6a800', 'MTR Light Rail',
                        ['tuen-mun-ferry-pier', 'on-ting', 'town-centre', 'siu-hong']),
    'light-rail-615': ('light_rail', 'Light Rail 615', '輕鐵 615', 'Metro Ligeiro 615', '#f6a800', 'MTR Light Rail',
                       ['tuen-mun-ferry-pier', 'town-centre', 'siu-hong', 'tin-shui-wai', 'yuen-long']),
    'light-rail-615p': ('light_rail', 'Light Rail 615P', '輕鐵 615P', 'Metro Ligeiro 615P', '#f6a800', 'MTR Light Rail',
                        ['tuen-mun-ferry-pier', 'town-centre', 'siu-hong']),
    'light-rail-705': ('light_rail', 'Light Rail 705', '輕鐵 705', 'Metro Ligeiro 705', '#f6a800', 'MTR Light Rail',
                       ['tin-shui-wai', 'tin-wing', 'tin-yat']),
    'light-rail-706': ('light_rail', 'Light Rail 706', '輕鐵 706', 'Metro Ligeiro 706', '#f6a800', 'MTR Light Rail',
                       ['tin-shui-wai', 'tin-wing', 'tin-yat']),
    'light-rail-751': ('light_rail', 'Light Rail 751', '輕鐵 751', 'Metro Ligeiro 751', '#f6a800', 'MTR Light Rail',
                       ['yau-oi', 'town-centre', 'siu-hong', 'tin-shui-wai', 'tin-yat']),
    'light-rail-751p': ('light_rail', 'Light Rail 751P', '輕鐵 751P', 'Metro Ligeiro 751P', '#f6a800', 'MTR Light Rail',
                        ['tin-shui-wai', 'tin-wing', 'tin-yat']),
    'light-rail-761p': ('light_rail', 'Light Rail 761P', '輕鐵 761P', 'Metro Ligeiro 761P', '#f6a800', 'MTR Light Rail',
                        ['tuen-mun', 'town-centre', 'siu-hong', 'tin-shui-wai', 'yuen-long']),
}

# ---------------------------------------------------------------- trips
# lineId: (startMinutes, endMinutes, headwayWeekday, headwayWeekend, durationWeekday, durationWeekend, dwell)
T = {
    'island': (330, 1500, 5, 7, 34, 35, 0.5),
    'tsuen-wan': (330, 1490, 6, 8, 38, 39, 0.5),
    'tuen-ma': (320, 1480, 7, 9, 62, 64, 0.5),
    'east-rail': (320, 1495, 5, 7, 46, 48, 0.5),
    'kwun-tong': (325, 1500, 5, 7, 35, 37, 0.5),
    'south-island': (345, 1480, 5, 7, 12, 13, 0.5),
    'tung-chung': (335, 1470, 8, 10, 30, 32, 0.5),
    'tseung-kwan-o': (330, 1500, 5, 7, 20, 22, 0.5),
    'disneyland-resort': (370, 1420, 10, 10, 5, 5, 0.5),
    'airport-express': (340, 1440, 10, 10, 28, 28, 0.5),
    'light-rail-505': (315, 1460, 8, 10, 12, 13, 0.75),
    'light-rail-507': (315, 1460, 8, 10, 12, 13, 0.75),
    'light-rail-610': (315, 1460, 8, 10, 36, 38, 0.75),
    'light-rail-614': (320, 1455, 9, 11, 38, 40, 0.75),
    'light-rail-614p': (335, 1420, 10, 12, 15, 16, 0.75),
    'light-rail-615': (320, 1455, 9, 11, 38, 40, 0.75),
    'light-rail-615p': (335, 1420, 10, 12, 15, 16, 0.75),
    'light-rail-705': (325, 1460, 8, 10, 12, 13, 0.75),
    'light-rail-706': (325, 1460, 8, 10, 12, 13, 0.75),
    'light-rail-751': (320, 1460, 8, 10, 32, 34, 0.75),
    'light-rail-751p': (340, 1430, 12, 12, 10, 10, 0.75),
    'light-rail-761p': (320, 1460, 9, 11, 34, 36, 0.75),
}

# Geographic direction label used in trip IDs, per line.
# Format: (outboundLabel, inboundLabel); direction field stays 'outbound'/'inbound'.
DIRECTION_LABELS = {
    'island': ('eastbound', 'westbound'),
    'tsuen-wan': ('northbound', 'southbound'),
    'tuen-ma': ('westbound', 'eastbound'),
    'east-rail': ('northbound', 'southbound'),
    'kwun-tong': ('eastbound', 'westbound'),
    'south-island': ('southbound', 'northbound'),
    'tung-chung': ('westbound', 'eastbound'),
    'tseung-kwan-o': ('eastbound', 'westbound'),
    'disneyland-resort': ('southbound', 'northbound'),
    'airport-express': ('westbound', 'eastbound'),
    'light-rail-505': ('northbound', 'southbound'),
    'light-rail-507': ('northbound', 'southbound'),
    'light-rail-610': ('northbound', 'southbound'),
    'light-rail-614': ('northbound', 'southbound'),
    'light-rail-614p': ('northbound', 'southbound'),
    'light-rail-615': ('northbound', 'southbound'),
    'light-rail-615p': ('northbound', 'southbound'),
    'light-rail-705': ('eastbound', 'westbound'),
    'light-rail-706': ('eastbound', 'westbound'),
    'light-rail-751': ('northbound', 'southbound'),
    'light-rail-751p': ('northbound', 'southbound'),
    'light-rail-761p': ('northbound', 'southbound'),
}


def build_rail_lines():
    lines = []
    for line_id, (mode, name_en, name_zh, name_pt, color, operator, station_ids) in L.items():
        geometry = [list(S[sid][3:]) for sid in station_ids]
        assert len(geometry) == len(station_ids), line_id
        lines.append({
            'id': line_id,
            'mode': mode,
            'nameEn': name_en,
            'nameZh': name_zh,
            'namePt': name_pt,
            'color': color,
            'operator': operator,
            'stationIds': station_ids,
            'geometry': geometry,
        })
    return lines


def build_stations():
    station_line_map = {}
    for line_id, (_, _, _, _, _, _, station_ids) in L.items():
        for sid in station_ids:
            station_line_map.setdefault(sid, []).append(line_id)
    stations = []
    for sid, (name_en, name_zh, name_pt, lon, lat) in S.items():
        stations.append({
            'id': sid,
            'nameEn': name_en,
            'nameZh': name_zh,
            'namePt': name_pt,
            'coordinates': [lon, lat],
            'lineIds': sorted(station_line_map[sid]),
        })
    return stations


def build_trips(schedule_type, suffix):
    trips = []
    for line_id, (start, end, headway_wd, headway_we, dur_wd, dur_we, dwell) in T.items():
        station_ids = L[line_id][6]
        headway = headway_wd if schedule_type == 'weekday' else headway_we
        duration = dur_wd if schedule_type == 'weekday' else dur_we
        assert duration > dwell * len(station_ids), (line_id, duration, dwell * len(station_ids))
        outbound_label, inbound_label = DIRECTION_LABELS[line_id]
        for direction, stops, offset, label in (
            ('outbound', station_ids, 0, outbound_label),
            ('inbound', list(reversed(station_ids)), 3, inbound_label),
        ):
            trip_id = f'{line_id}-{label}-{suffix}' if suffix else f'{line_id}-{label}'
            trips.append({
                'id': trip_id,
                'lineId': line_id,
                'direction': direction,
                'scheduleType': schedule_type,
                'startMinutes': start + offset,
                'endMinutes': end,
                'headwayMinutes': headway,
                'durationMinutes': duration,
                'dwellMinutes': dwell,
                'stopIds': stops,
            })
    return trips


def main():
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'data')
    out_dir = os.path.normpath(out_dir)
    os.makedirs(out_dir, exist_ok=True)

    rail_lines = build_rail_lines()
    stations = build_stations()
    trips_wd = build_trips('weekday', '')
    trips_we = build_trips('weekend', 'weekend')

    # cross-file integrity self-check
    line_ids = {ln['id'] for ln in rail_lines}
    station_ids = {st['id'] for st in stations}
    for ln in rail_lines:
        assert len(ln['stationIds']) == len(ln['geometry'])
        for sid in ln['stationIds']:
            assert sid in station_ids, f'{ln["id"]} unknown station {sid}'
    for st in stations:
        for lid in st['lineIds']:
            assert lid in line_ids, f'{st["id"]} unknown line {lid}'
    for tr in trips_wd + trips_we:
        line_stations = set(L[tr['lineId']][6])
        assert tr['lineId'] in line_ids
        for stop in tr['stopIds']:
            assert stop in line_stations, f'{tr["id"]} stop {stop} not on {tr["lineId"]}'
        assert tr['durationMinutes'] > tr['dwellMinutes'] * len(tr['stopIds'])

    files = {
        'rail-lines.json': rail_lines,
        'stations.json': stations,
        'trips-weekday.json': trips_wd,
        'trips-weekend.json': trips_we,
    }
    for name, payload in files.items():
        path = os.path.join(out_dir, name)
        with open(path, 'w', encoding='utf-8') as fh:
            json.dump(payload, fh, ensure_ascii=False, indent=2)
            fh.write('\n')
        print(f'wrote {path}: {len(payload)} records')

    print(f'total lines: {len(rail_lines)}, stations: {len(stations)}, '
          f'trips weekday: {len(trips_wd)}, weekend: {len(trips_we)}')


if __name__ == '__main__':
    sys.exit(main())
