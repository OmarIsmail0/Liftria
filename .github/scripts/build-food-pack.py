#!/usr/bin/env python3
"""Build Liftria's offline food pack from USDA FoodData Central (public domain, CC0).

Inputs: the SR Legacy and Foundation CSV zips (paths as arguments).
Output: assets/data/foods/usda-foods.json, compact and sorted by id.

Per food: values per 100 g, plus household portions in grams where FDC has them.
Only kcal, protein, carbs, fat and fiber are kept. A food without kcal is dropped.
"""
import csv, io, json, sys, zipfile

# FDC nutrient ids. Energy: 1008 (kcal); Foundation foods often only carry the
# Atwater energies 2047 (general) / 2048 (specific), used in that order as fallback.
KCAL, KCAL_ATWATER_GENERAL, KCAL_ATWATER_SPECIFIC = '1008', '2047', '2048'
PROTEIN, FAT, CARBS, FIBER = '1003', '1004', '1005', '1079'
WANTED = {KCAL, KCAL_ATWATER_GENERAL, KCAL_ATWATER_SPECIFIC, PROTEIN, FAT, CARBS, FIBER}


def rows(z, suffix):
    name = next(n for n in z.namelist() if n.endswith('/' + suffix) or n == suffix)
    with z.open(name) as f:
        yield from csv.DictReader(io.TextIOWrapper(f, encoding='utf-8'))


def load(path, source):
    z = zipfile.ZipFile(path)
    data_type = {'sr': 'sr_legacy_food', 'foundation': 'foundation_food'}[source]
    categories = {r['id']: r['description'] for r in rows(z, 'food_category.csv')}
    foods = {}
    for r in rows(z, 'food.csv'):
        if r['data_type'] != data_type:
            continue
        foods[r['fdc_id']] = {'name': r['description'].strip(),
                              'category': categories.get(r['food_category_id'], ''), 'n': {}}
    for r in rows(z, 'food_nutrient.csv'):
        food = foods.get(r['fdc_id'])
        if food is not None and r['nutrient_id'] in WANTED and r['amount'] not in ('', None):
            food['n'][r['nutrient_id']] = float(r['amount'])
    units = {r['id']: r['name'] for r in rows(z, 'measure_unit.csv')}
    portions = {}
    for r in rows(z, 'food_portion.csv'):
        if r['fdc_id'] not in foods or not r['gram_weight']:
            continue
        grams = float(r['gram_weight'])
        if grams <= 0:
            continue
        amount = r.get('amount') or '1'
        unit = units.get(r.get('measure_unit_id') or '', '')
        unit = '' if unit in ('undetermined', '') else unit
        label = ' '.join(x for x in [amount if amount not in ('', '1.0', '1') else '1', unit,
                                     (r.get('modifier') or '').strip(),
                                     (r.get('portion_description') or '').strip()] if x).strip()
        label = ' '.join(label.split())
        if 'quantity not specified' in label.lower():
            continue
        if label and label != '1':
            portions.setdefault(r['fdc_id'], []).append([label, round(grams, 2)])
    out = []
    for fdc_id, food in foods.items():
        n = food['n']
        kcal = n.get(KCAL, n.get(KCAL_ATWATER_GENERAL, n.get(KCAL_ATWATER_SPECIFIC)))
        if kcal is None:
            continue
        seen, uniq = set(), []
        for label, grams in portions.get(fdc_id, []):
            if label.lower() not in seen:
                seen.add(label.lower())
                uniq.append([label, grams])
        out.append({'id': 'usda:' + fdc_id, 'name': food['name'], 'category': food['category'],
                    'source': source, 'kcal': round(kcal, 1),
                    'protein': round(n.get(PROTEIN, 0.0), 2), 'carbs': round(n.get(CARBS, 0.0), 2),
                    'fat': round(n.get(FAT, 0.0), 2),
                    'fiber': round(n[FIBER], 2) if FIBER in n else None,
                    'portions': uniq})
    return out


def main(sr_zip, foundation_zip, out_path):
    foods = load(sr_zip, 'sr') + load(foundation_zip, 'foundation')
    foods.sort(key=lambda f: int(f['id'].split(':')[1]))
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(foods, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')
    with_portions = sum(1 for f in foods if f['portions'])
    print(f'{len(foods)} foods ({with_portions} with household portions) -> {out_path}')


if __name__ == '__main__':
    main(*sys.argv[1:4])
