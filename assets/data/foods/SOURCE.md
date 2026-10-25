# Food data source

- **Source:** USDA FoodData Central, https://fdc.nal.usda.gov/ (public domain, CC0 1.0).
- **Files:** `FoodData_Central_sr_legacy_food_csv_2018-04.zip` and `FoodData_Central_foundation_food_csv_2026-04-30.zip`, downloaded 2026-10-25.
- **SHA-256:**
  - b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0  sr.zip
  - 70457ee9d9342f43bda2010318c85f04210c689fdeb9cd2da4c513b0e8dbc655  foundation.zip
- **Built by:** `.github/scripts/build-food-pack.py` (the `Build USDA food pack` workflow).
- **Per food:** stable `id` (`usda:<fdcId>`), name, FDC category, source (sr or foundation), kcal, protein, carbs, fat and fiber per 100 g, and household portions in grams where FDC has them.
- **Credit (shown in the app):** "Food data: USDA FoodData Central (public domain)."

# Egyptian foods (`egypt-foods.json`)

- **What:** 29 common Egyptian dishes, breads, sandwiches, desserts and drinks, with English and Arabic names, search aliases (Arabic spellings and transliterations), and Egyptian portions in grams (plate, loaf, piece, sandwich, glass).
- **How the numbers are made:** `egypt-recipes.json` holds a typical home recipe per dish, written by Claude (2026-10-25) as USDA FoodData Central ingredients in grams, plus the finished weight after cooking (`yield_g`). `.github/scripts/build-egypt-foods.py` sums the ingredients and gives values per 100 g of the finished dish.
- **They are estimates.** Every row has `estimate: true`. The app shows the `estimate` chip and "Recipe estimate from USDA ingredients". Real dishes vary by cook and shop. Never present them as measured or as a lab analysis.
- **Changing a dish:** edit its recipe, rebuild (`python3 .github/scripts/build-egypt-foods.py assets/data/foods/egypt-recipes.json assets/data/foods/usda-foods.json assets/data/foods/egypt-foods.json`), and keep every id (ids are stable, like the USDA ones).
- **Owner review wanted:** names, Arabic spelling, portion sizes (e.g. is a baladi loaf about 100 g?), and missing everyday foods.
