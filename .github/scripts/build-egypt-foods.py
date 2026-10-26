#!/usr/bin/env python3
"""Build assets/data/foods/egypt-foods.json from egypt-recipes.json and the USDA pack.

Each dish: sum each ingredient's per-100 g values x grams/100, divide by the yield
(finished weight) and express per 100 g. Recipes may use other egypt ids, built first.
Output rows match usda-foods.json plus name_ar, aliases, estimate and recipe fields.
"""
import json, sys

FIELDS = ('kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium')


def main(recipes_path, usda_path, out_path):
    recipes = json.load(open(recipes_path, encoding='utf-8'))['recipes']
    foods = {f['id']: f for f in json.load(open(usda_path, encoding='utf-8'))}
    pending = {r['id']: r for r in recipes}
    if len(pending) != len(recipes):
        raise SystemExit('duplicate recipe id')
    built, out = {}, []
    while pending:
        progressed = False
        for rid, r in list(pending.items()):
            ids = [i for i, _ in r['ingredients'] if i != 'water']
            if any(i.startswith('egypt:') and i not in built for i in ids):
                continue
            total, weight = {k: 0.0 for k in FIELDS}, 0.0
            unknown = set()  # a field any ingredient lacks is unknown for the dish, never 0
            for iid, grams in r['ingredients']:
                weight += grams
                if iid == 'water':
                    continue
                src = built.get(iid) or foods.get(iid)
                if src is None:
                    raise SystemExit(f'{rid}: unknown ingredient {iid}')
                for k in FIELDS:
                    if src.get(k) is None:
                        unknown.add(k)
                        continue
                    total[k] += src[k] * grams / 100
            yield_g = r.get('yield_g', weight)
            if not 0 < yield_g <= weight * 1.05:
                raise SystemExit(f'{rid}: yield {yield_g} vs ingredients {weight}')
            row = {'id': rid, 'name': r['name_en'], 'name_ar': r['name_ar'], 'aliases': r['aliases'],
                   'category': r['category'], 'source': 'egypt', 'estimate': True}
            for k in FIELDS:
                row[k] = None if k in unknown else round(total[k] * 100 / yield_g, 1 if k in ('kcal', 'sodium') else 2)
            row['portions'] = [[en, ar, g] for en, ar, g in r['portions']]
            row['recipe'] = {'ingredients': r['ingredients'], 'yield_g': yield_g}
            built[rid] = row
            out.append(row)
            del pending[rid]
            progressed = True
        if not progressed:
            raise SystemExit('recipe cycle: ' + ', '.join(pending))
    out.sort(key=lambda f: f['id'])
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
        f.write('\n')
    for r in out:
        print(f"{r['id']:<34} {r['kcal']!s:>6} kcal  P{r['protein']!s:>5}  C{r['carbs']!s:>5}  F{r['fat']!s:>5}  per 100 g")


if __name__ == '__main__':
    main(*sys.argv[1:4])
