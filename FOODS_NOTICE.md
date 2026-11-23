# Common foods library

`foods-data.js` is the offline food list used by the Add food sheet. `tools/build_foods.py` builds it. The numbers are copied or scaled from published sources. Nothing in this file is a lab result, a prescription, or a body measurement.

## Sources

- **USDA FoodData Central, SR Legacy (April 2018).** Grocery staples and chain items (McDonald's, Burger King, Wendy's, Pizza Hut, Domino's, Papa John's, Little Caesars, Taco Bell, Subway, KFC, Popeyes, Chick-fil-A). Nutrients are per 100 g in that release; each row is scaled to the portion gram weight published with the food. Citation: U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, SR Legacy. fdc.nal.usda.gov. The `src` field on each row is the FDC id.
- **USDA FoodData Central, FNDDS 2021–2023** (survey foods, published October 2024). Generic restaurant pepperoni pizza by size and crust, wings, fries, tacos, nuggets, coffee drinks, juice, and whey scoops. Same per-100 g scaling to the survey portion.
- **USDA FoodData Central, Branded.** A few packaged foods whose brand owner and household serving were taken from the food record: Kirkland Signature chicken breast (FDC 378251) and chocolate chunk cookie (FDC 2087961), Great Value Greek nonfat yogurts (FDC 2083367, 2083374), Optimum Nutrition Gold Standard 100% Whey packet (FDC 2475031), Fairlife milks (FDC 2757397, 2757704), Premier Protein bar (FDC 2117681, label nutrients).
- **Chipotle US nutrition facts**, paper menu code **OCT-2024-US-CK**, file `US-Nutrition-Facts-Paper-Menu-3-2025.pdf` on chipotle.com. Bowl components use the published portion, calories, protein, carbohydrate, and total fat. Weight ounces are stored as grams at 28.35 g/oz so a kitchen scale can scale them. Fluid-ounce items (salsas labeled fl oz, vinaigrette, tortillas sold "each") do not invent a gram weight.

## How a serving was chosen

The common household portion in the source (1 slice, 3 oz, 1 cup, 1 large egg, 12 fl oz, and so on). Chain pizzas use the slice portion, not the whole pie. `kcal` / `p` / `c` / `f` are for that one serving. The app multiplies them when he logs 0.5, 1.5, 2, or a gram weight.

## Checks

`node tools/check_foods.mjs` requires finite non-negative macros, a serving string, and calories within about 22% of `4·protein + 4·carbs + 9·fat + 7·alcohol` (or 30 kcal). Alcohol grams are kept only so beer and wine are not punished for energy that is not in the macros. USDA energy is an Atwater value, and restaurant labels round, so the match is approximate on purpose.

## Limitations

- SR Legacy chain items are the April 2018 analytical set. A current menu board can differ. The name keeps the chain, size, and crust so the row is the food that was measured.
- The Gold Standard "scoop" of 20.5 g is the FNDDS portion, which is smaller than the 31 g scoop Optimum Nutrition prints on many tubs. The separate packet row is the branded 30.4 g serving.
- Great Value peanut butter and a Costco rotisserie chicken were not pinned to a single branded record, so those exact SKUs are not in the list. USDA peanut butter and grilled chicken breast are.
- Personal foods he saves live in `food.custom` on the phone, not in this file.
