#!/usr/bin/env python3
"""Build foods-data.js from local USDA FoodData Central downloads.

Downloads are not committed. Expected paths (override with USDA_DIR):

  FoodData_Central_sr_legacy_food_json_2018-04.json
  FoodData_Central_foundation_food_json_2026-10-29.json
  surveyDownload.json   (FNDDS 2021–2023)

Chipotle rows are the figures extracted from Chipotle's US paper menu
(US-Nutrition-Facts-Paper-Menu-3-2025.pdf, code OCT-2024-US-CK).
Branded rows use USDA Branded label values recorded from FDC food records
cited in FOODS_NOTICE.md. This script does not invent nutrient numbers:
every grocery and restaurant row is scaled from a published per-100 g
analysis or copied from a published label.
"""
import json, os, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
USDA = Path(os.environ.get('USDA_DIR', '/tmp/usda'))
OUT = ROOT / 'foods-data.js'

NUT = {'203': 'p', '204': 'f', '205': 'c', '208': 'kcal', '1008': 'kcal', '221': 'a', '1018': 'a', '957': 'kcal_atwater'}


def load(name):
    p = USDA / name
    if not p.exists():
        sys.exit(f'missing {p} (set USDA_DIR)')
    with p.open() as f:
        return json.load(f)


def per100(food):
    out = {}
    for n in food.get('foodNutrients') or []:
        nut = n.get('nutrient') or {}
        key = NUT.get(str(nut.get('number')))
        if not key or n.get('amount') is None:
            continue
        if key == 'kcal' or key not in out:
            out[key] = float(n['amount'])
    if 'kcal' not in out and 'kcal_atwater' in out:
        out['kcal'] = out['kcal_atwater']
    out.pop('kcal_atwater', None)
    return out


def portions(food):
    rows = []
    for p in food.get('foodPortions') or []:
        g = p.get('gramWeight')
        if not g or float(g) <= 0:
            continue
        mod = (p.get('modifier') or '').strip()
        desc = (p.get('portionDescription') or '').strip()
        rows.append({'amount': p.get('amount'), 'modifier': mod, 'desc': desc, 'g': float(g),
                     'blob': f"{p.get('amount') or ''} {mod} {desc}".lower()})
    return rows


def nice_qty(p):
    label = p['desc'] or p['modifier'] or 'serving'
    amt = p['amount']
    if amt is None or re.match(r'^\s*\d', label):
        return re.sub(r'\s+', ' ', label).strip()
    a = float(amt)
    if abs(a - 0.5) < 1e-6:
        shown = '1/2'
    elif abs(a - 0.25) < 1e-6:
        shown = '1/4'
    elif abs(a - round(a)) < 1e-6:
        shown = str(int(round(a)))
    else:
        shown = f'{a:.2f}'.rstrip('0').rstrip('.')
    if label.lower().startswith(shown + ' '):
        return label
    return f'{shown} {label}'.strip()


def match_portion(food, spec):
    ports = portions(food)
    if isinstance(spec, dict) and 'amount' in spec:
        mod = spec.get('modifier', '').lower()
        hits = [p for p in ports if p['modifier'].lower() == mod and p['amount'] is not None and abs(float(p['amount']) - float(spec['amount'])) < 1e-6]
        return hits[0] if hits else None
    needle = spec.lower()
    hits = [p for p in ports if needle in p['blob']]
    if not hits:
        return None
    hits.sort(key=lambda p: (len(p['desc'] or p['modifier']), abs(float(p['amount'] or 1) - 1), p['g']))
    return hits[0]


def r1(n):
    return round(n, 1)


def scale(per, grams):
    if 'kcal' not in per:
        return None
    k = grams / 100.0
    item = {'p': r1(per.get('p', 0) * k), 'c': r1(per.get('c', 0) * k), 'f': r1(per.get('f', 0) * k),
            'kcal': int(round(per['kcal'] * k))}
    if per.get('a'):
        item['a'] = r1(per['a'] * k)
    return item


def consistent(item):
    exp = 4 * item['p'] + 4 * item['c'] + 9 * item['f'] + 7 * item.get('a', 0)
    diff = abs(item['kcal'] - exp)
    return diff <= max(30, 0.22 * max(item['kcal'], exp, 1)), exp, diff


# (db, description or fdc id str, portion spec, name, cat, pop, aka, srv override or None, force grams or None)
PICKS = [
    ('sr', 'Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, grilled', {'amount': 3, 'modifier': 'oz'},
     'Chicken breast, grilled', 'grocery', 1, 'chicken', '3 oz (85 g)', None),
    ('sr', 'Chicken, broilers or fryers, thigh, meat only, cooked, roasted', {'amount': 3, 'modifier': 'oz'},
     'Chicken thigh, roasted, skinless', 'grocery', 0, 'chicken', '3 oz (85 g)', None),
    ('sr', 'Beef, ground, 95% lean meat / 5% fat, patty, cooked, broiled', {'amount': 3, 'modifier': 'oz'},
     'Ground beef, 95% lean, broiled', 'grocery', 0, 'hamburger', '3 oz (85 g)', None),
    ('sr', 'Beef, ground, 93% lean meat / 7% fat, patty, cooked, broiled', {'amount': 3, 'modifier': 'oz'},
     'Ground beef, 93% lean, broiled', 'grocery', 1, 'hamburger', '3 oz (85 g)', None),
    ('sr', 'Beef, ground, 90% lean meat / 10% fat, patty, cooked, broiled', {'amount': 3, 'modifier': 'oz'},
     'Ground beef, 90% lean, broiled', 'grocery', 1, 'hamburger', '3 oz (85 g)', None),
    ('sr', 'Beef, ground, 85% lean meat / 15% fat, patty, cooked, broiled', {'amount': 3, 'modifier': 'oz'},
     'Ground beef, 85% lean, broiled', 'grocery', 0, 'hamburger', '3 oz (85 g)', None),
    ('sr', 'Beef, ground, 80% lean meat / 20% fat, patty, cooked, broiled', {'amount': 3, 'modifier': 'oz'},
     'Ground beef, 80% lean, broiled', 'grocery', 1, 'hamburger', '3 oz (85 g)', None),
    ('sr', 'Beef, top sirloin, steak, separable lean only, trimmed to 0" fat, choice, cooked, broiled', {'amount': 3, 'modifier': 'oz'},
     'Top sirloin steak, broiled', 'grocery', 0, 'beef', '3 oz (85 g)', None),
    ('sr', 'Pork, fresh, loin, top loin (chops), boneless, separable lean only, cooked, broiled', 'chop',
     'Pork chop, broiled', 'grocery', 0, '', None, None),
    ('sr', 'Pork, cured, bacon, pre-sliced, cooked, pan-fried', 'slice',
     'Bacon, pan-fried', 'grocery', 1, '', '1 slice', None),
    ('sr', 'Turkey, ground, 93% lean, 7% fat, pan-broiled crumbles', {'amount': 3, 'modifier': 'oz'},
     'Ground turkey, 93% lean', 'grocery', 0, '', '3 oz (85 g)', None),
    ('sr', 'Turkey breast, sliced, prepackaged', 'slice',
     'Turkey breast, deli slice', 'grocery', 0, 'lunch meat', '1 slice', None),
    ('sr', 'Ham, sliced, regular (approximately 11% fat)', 'slice',
     'Ham, deli slice', 'grocery', 0, 'lunch meat', '1 slice', None),
    ('sr', 'Fish, salmon, Atlantic, farmed, cooked, dry heat', {'amount': 3, 'modifier': 'oz'},
     'Salmon, Atlantic, cooked', 'grocery', 0, 'fish', '3 oz (85 g)', None),
    ('sr', 'Fish, tuna, light, canned in water, drained solids (Includes foods for USDA\'s Food Distribution Program)', {'amount': 3, 'modifier': 'oz'},
     'Tuna, canned in water, drained', 'grocery', 1, 'fish', '3 oz (85 g)', None),
    ('sr', 'Fish, tilapia, cooked, dry heat', 'fillet',
     'Tilapia, cooked', 'grocery', 0, 'fish', None, None),
    ('sr', 'Crustaceans, shrimp, mixed species, cooked, moist heat (may contain additives to retain moisture)', {'amount': 3, 'modifier': 'oz'},
     'Shrimp, cooked', 'grocery', 0, '', '3 oz (85 g)', None),
    ('sr', 'Egg, whole, cooked, hard-boiled', 'large',
     'Egg, hard-boiled', 'grocery', 1, 'eggs', '1 large', None),
    ('sr', 'Egg, whole, cooked, scrambled', 'large',
     'Egg, scrambled', 'grocery', 1, 'eggs', '1 large', None),
    ('sr', 'Egg, whole, cooked, fried', 'large',
     'Egg, fried', 'grocery', 0, 'eggs', '1 large', None),
    ('sr', 'Egg, white, raw, fresh', 'large',
     'Egg white, raw', 'gym', 1, 'eggs', '1 large', None),
    ('sr', 'Rice, white, long-grain, regular, enriched, cooked', 'cup',
     'White rice, cooked', 'grocery', 1, 'rice', '1 cup', None),
    ('sr', 'Rice, brown, long-grain, cooked (Includes foods for USDA\'s Food Distribution Program)', 'cup',
     'Brown rice, cooked', 'grocery', 0, 'rice', '1 cup', None),
    ('sr', 'Cereals, oats, regular and quick, not fortified, dry', 'cup',
     'Oats, dry', 'gym', 1, 'oatmeal quaker', '40 g dry', 40),
    ('sr', 'Quinoa, cooked', 'cup',
     'Quinoa, cooked', 'grocery', 0, '', '1 cup', None),
    ('sr', 'Pasta, cooked, enriched, without added salt', 'spaghetti',
     'Pasta, cooked', 'grocery', 1, 'spaghetti noodles', '1 cup spaghetti', None),
    ('sr', 'Potatoes, baked, flesh and skin, without salt', 'potato medium',
     'Baked potato, medium', 'grocery', 1, '', '1 medium potato', None),
    ('sr', 'Sweet potato, cooked, baked in skin, flesh, without salt', 'medium',
     'Sweet potato, baked', 'grocery', 0, '', '1 medium', None),
    ('sr', 'Beans, black, mature seeds, cooked, boiled, without salt', 'cup',
     'Black beans, cooked', 'grocery', 0, '', '1 cup', None),
    ('sr', 'Lentils, mature seeds, cooked, boiled, without salt', 'cup',
     'Lentils, cooked', 'grocery', 0, '', '1 cup', None),
    ('sr', 'Bread, whole-wheat, commercially prepared', 'slice',
     'Whole-wheat bread', 'grocery', 1, '', '1 slice', None),
    ('sr', 'Bread, white, commercially prepared (includes soft bread crumbs)', 'slice',
     'White bread', 'grocery', 1, '', '1 slice', None),
    ('sr', 'Bagels, plain, enriched, with calcium propionate (includes onion, poppy, sesame)', 'medium bagel',
     'Plain bagel', 'grocery', 0, '', '1 medium bagel', None),
    ('sr', 'Tortillas, ready-to-bake or -fry, flour, shelf stable', 'tortilla',
     'Flour tortilla', 'grocery', 1, '', '1 tortilla', None),
    ('sr', 'Tortillas, ready-to-bake or -fry, corn, without added salt', 'tortilla, medium',
     'Corn tortilla', 'grocery', 0, 'taco shell', '1 medium tortilla', None),
    ('sr', 'Milk, whole, 3.25% milkfat, with added vitamin D', 'cup',
     'Milk, whole', 'grocery', 0, '', '1 cup', None),
    ('sr', 'Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D', 'cup',
     'Milk, 2%', 'grocery', 1, 'reduced fat', '1 cup', None),
    ('sr', 'Milk, nonfat, fluid, with added vitamin A and vitamin D (fat free or skim)', 'cup',
     'Milk, skim', 'grocery', 0, 'nonfat fat free', '1 cup', None),
    ('sr', 'Milk, chocolate, fluid, commercial, reduced fat, with added vitamin A and vitamin D', 'cup',
     'Chocolate milk, reduced fat', 'drink', 0, '', '1 cup', None),
    ('sr', 'Yogurt, Greek, plain, nonfat (Includes foods for USDA\'s Food Distribution Program)', 'container',
     'Greek yogurt, plain nonfat', 'gym', 1, '', '1 container', None),
    ('sr', 'Yogurt, Greek, plain, lowfat', 'container',
     'Greek yogurt, plain lowfat', 'gym', 0, '', '1 container (7 oz)', None),
    ('sr', 'Cheese, cheddar, sharp, sliced', 'slice (1 oz)',
     'Cheddar cheese', 'grocery', 1, '', '1 slice (1 oz)', None),
    ('sr', 'Cheese, mozzarella, part skim milk', 'oz',
     'Mozzarella, part skim', 'grocery', 0, '', '1 oz', None),
    ('sr', 'Cheese, parmesan, grated', 'tbsp',
     'Parmesan, grated', 'grocery', 0, '', '1 tbsp', None),
    ('sr', 'Cheese, feta', 'oz',
     'Feta cheese', 'grocery', 0, '', None, None),
    ('sr', 'Cheese, cottage, lowfat, 2% milkfat', '4.0 oz',
     'Cottage cheese, 2%', 'gym', 1, '', '1/2 cup (113 g)', None),
    ('sr', 'Cheese, cottage, creamed, large or small curd', '4.0 oz',
     'Cottage cheese, whole milk', 'grocery', 0, '', '4 oz', None),
    ('sr', 'Cheese, cream', 'tbsp',
     'Cream cheese', 'grocery', 0, '', '1 tbsp', None),
    ('sr', 'Butter, salted', 'tbsp',
     'Butter', 'grocery', 0, '', '1 tbsp', None),
    ('sr', 'Oil, olive, salad or cooking', 'tablespoon',
     'Olive oil', 'grocery', 0, '', '1 tbsp', None),
    ('sr', 'Oil, canola', 'tbsp',
     'Canola oil', 'grocery', 0, '', '1 tbsp', None),
    ('sr', 'Peanut butter, smooth style, without salt', '2.0 tbsp',
     'Peanut butter, smooth', 'grocery', 1, 'pb', '2 tbsp', None),
    ('sr', 'Nuts, almonds', 'oz (23 whole kernels)',
     'Almonds', 'grocery', 1, 'nuts', '1 oz (23 almonds)', None),
    ('sr', 'Peanuts, all types, dry-roasted, without salt', 'oz',
     'Peanuts, dry roasted', 'grocery', 0, 'nuts', '1 oz', None),
    ('sr', 'Nuts, walnuts, english', 'oz (14 halves)',
     'Walnuts', 'grocery', 0, 'nuts', '1 oz (14 halves)', None),
    ('sr', 'Nuts, cashew nuts, raw', 'oz',
     'Cashews', 'grocery', 0, 'nuts', '1 oz', None),
    ('sr', 'Seeds, sunflower seed kernels, dry roasted, without salt', 'oz',
     'Sunflower seeds, dry roasted', 'grocery', 0, '', '1 oz', None),
    ('sr', 'Hummus, commercial', 'tbsp',
     'Hummus', 'grocery', 0, '', '1 tbsp', None),
    ('sr', 'Bananas, raw', 'medium (7',
     'Banana', 'grocery', 1, 'fruit', '1 medium', None),
    ('sr', 'Apples, raw, with skin (Includes foods for USDA\'s Food Distribution Program)', 'medium (3',
     'Apple', 'grocery', 1, 'fruit', '1 medium', None),
    ('sr', 'Blueberries, raw', '1.0 cup',
     'Blueberries', 'grocery', 0, 'fruit', '1 cup', None),
    ('sr', 'Strawberries, raw', 'cup, sliced',
     'Strawberries', 'grocery', 0, 'fruit', '1 cup, sliced', None),
    ('sr', 'Grapes, red or green (European type, such as Thompson seedless), raw', 'cup',
     'Grapes', 'grocery', 0, 'fruit', '1 cup', None),
    ('sr', 'Watermelon, raw', 'wedge',
     'Watermelon', 'grocery', 0, 'fruit', '1 wedge', None),
    ('sr', 'Avocados, raw, all commercial varieties', 'avocado, NS',
     'Avocado', 'grocery', 1, '', '1/2 avocado', None),
    ('sr', 'Broccoli, raw', 'cup chopped',
     'Broccoli, raw', 'grocery', 0, 'vegetable', '1 cup chopped', None),
    ('sr', 'Broccoli, cooked, boiled, drained, without salt', '0.5 cup, chopped',
     'Broccoli, cooked', 'grocery', 1, 'vegetable', '1/2 cup chopped', None),
    ('sr', 'Spinach, raw', 'cup',
     'Spinach, raw', 'grocery', 0, 'vegetable', '1 cup', None),
    ('sr', 'Lettuce, cos or romaine, raw', 'cup shredded',
     'Romaine lettuce', 'grocery', 0, 'vegetable', '1 cup shredded', None),
    ('sr', 'Carrots, raw', 'medium',
     'Carrot', 'grocery', 0, 'vegetable', '1 medium', None),
    ('sr', 'Tomatoes, red, ripe, raw, year round average', 'medium whole',
     'Tomato', 'grocery', 0, 'vegetable', '1 medium', None),
    ('sr', 'Cucumber, with peel, raw', 'cup slices',
     'Cucumber', 'grocery', 0, 'vegetable', '1 cup slices', None),
    ('sr', 'Corn, sweet, yellow, cooked, boiled, drained, without salt', 'cup',
     'Corn, boiled', 'grocery', 0, 'vegetable', '1 cup', None),
    ('sr', 'Beverages, carbonated, cola, regular', 'can or bottle (12 fl oz)',
     'Cola', 'drink', 1, 'coke soda pepsi', '12 fl oz can', None),
    ('sr', 'Beverages, carbonated, low calorie, cola or pepper-types, with sodium saccharin, contains caffeine', 'can (12 fl oz)',
     'Diet cola', 'drink', 1, 'coke zero diet coke diet pepsi soda', '12 fl oz can', None),
    ('sr', 'Beverages, carbonated, root beer', 'can or bottle (12 fl oz)',
     'Root beer', 'drink', 0, 'soda', '12 fl oz', None),
    ('sr', 'Beverages, COCA-COLA, POWERADE, lemon-lime flavored, ready-to-drink', {'amount': 12, 'modifier': 'fl oz'},
     'Powerade, lemon-lime', 'drink', 0, 'gatorade sports drink', '12 fl oz', None),
    ('sr', 'Alcoholic beverage, beer, regular, all', 'can',
     'Beer, regular', 'drink', 1, 'lager', '12 fl oz can', None),
    ('sr', 'Alcoholic beverage, beer, light', 'can or bottle (12 fl oz)',
     'Beer, light', 'drink', 0, 'lite lager', '12 fl oz', None),
    ('sr', 'Alcoholic beverage, wine, table, red', 'serving (5 fl oz)',
     'Red wine', 'drink', 0, '', '5 fl oz', None),
    ('sr', 'Beverages, coffee, brewed, prepared with tap water', 'cup (8 fl oz)',
     'Coffee, brewed', 'drink', 1, 'black coffee', '8 fl oz', None),
    ('sr', 'Beverages, tea, black, brewed, prepared with tap water', 'cup (8 fl oz)',
     'Black tea, brewed', 'drink', 0, '', '8 fl oz', None),
    ('sr', 'Honey', 'tbsp',
     'Honey', 'grocery', 0, '', '1 tbsp', None),
    ('sr', 'Syrups, maple', 'tbsp',
     'Maple syrup', 'grocery', 0, '', '1 tbsp', None),
    ('sr', 'Catsup', 'tbsp',
     'Ketchup', 'grocery', 0, 'catsup', '1 tbsp', None),
    ('sr', 'Sauce, salsa, ready-to-serve', 'tbsp',
     'Salsa', 'grocery', 0, '', '1 tbsp', None),
    ('sr', 'Salad dressing, mayonnaise, regular', 'tbsp',
     'Mayonnaise', 'grocery', 0, 'mayo', '1 tbsp', None),
    ('sr', 'Ice creams, vanilla', '1/2 cup',
     'Vanilla ice cream', 'snack', 1, 'dessert', '1/2 cup', None),
    ('sr', 'Cookies, chocolate chip, commercially prepared, regular, higher fat, enriched', 'cookie, big',
     'Chocolate chip cookie', 'snack', 1, 'dessert', '1 large cookie', None),
    ('sr', 'Snacks, potato chips, plain, salted', 'oz',
     'Potato chips', 'snack', 1, 'lays', '1 oz', None),
    ('sr', 'Snacks, tortilla chips, plain, white corn, salted', 'oz',
     'Tortilla chips', 'snack', 0, 'doritos', '1 oz', None),
    ('sr', 'Snacks, popcorn, air-popped', 'cup',
     'Popcorn, air-popped', 'snack', 0, '', '1 cup', None),
    ('sr', 'Snacks, granola bars, soft, uncoated, plain', 'bar',
     'Granola bar, plain', 'snack', 0, '', '1 bar (1 oz)', None),
    ('sr', 'Candies, REESE\'S Peanut Butter Cups', 'package 1.6 oz 2 cups',
     "Reese's peanut butter cups", 'snack', 1, 'reeses candy', '2 cups (1.6 oz)', None),
    ('sr', 'Cereals ready-to-eat, GENERAL MILLS, CHEERIOS', 'cup',
     'Cheerios', 'grocery', 0, 'cereal', '1 cup', None),
    ('sr', 'Beverages, Protein powder whey based', 'cup',
     'Whey protein powder', 'gym', 1, 'protein scoop', '1 oz (28 g)', 28.35),
    ('sv', '2708639', '1 piece, large pizza',
     'Pepperoni pizza, restaurant, 14" large, thin crust', 'pizza', 1, 'pepperoni pizza slice', '1 slice (14" large, thin)', None),
    ('sv', '2708639', '1 piece, medium pizza',
     'Pepperoni pizza, restaurant, 12" medium, thin crust', 'pizza', 0, 'pepperoni pizza slice', '1 slice (12" medium, thin)', None),
    ('sv', '2708639', '1 personal size pizza',
     'Pepperoni pizza, restaurant, personal thin crust', 'pizza', 0, 'pepperoni pizza', '1 personal pizza (6")', None),
    ('sv', '2708640', '1 piece, large pizza',
     'Pepperoni pizza, restaurant, 14" large', 'pizza', 1, 'pepperoni pizza slice', '1 slice (14" large)', None),
    ('sv', '2708640', '1 piece, medium pizza',
     'Pepperoni pizza, restaurant, 12" medium', 'pizza', 0, 'pepperoni pizza slice', '1 slice (12" medium)', None),
    ('sv', '2708641', '1 piece, large pizza',
     'Pepperoni pizza, restaurant, 14" large, thick crust', 'pizza', 0, 'pepperoni pizza slice', '1 slice (14" large, thick)', None),
    ('sv', '2708642', '1 piece, large pizza',
     'Pepperoni pizza, restaurant, 14" large, stuffed crust', 'pizza', 0, 'pepperoni pizza slice', '1 slice (14" large, stuffed)', None),
    ('sv', '2708642', '1 piece, medium pizza',
     'Pepperoni pizza, restaurant, 12" medium, stuffed crust', 'pizza', 0, 'pepperoni pizza slice', '1 slice (12" medium, stuffed)', None),
    ('sv', '2706070', '1 drummette',
     'Chicken wings with hot sauce, fast food', 'fast-food', 1, 'buffalo wings wing', '1 drummette', None),
    ('sv', '2709461', '1 large fast food order',
     'French fries, fast food, large', 'fast-food', 1, 'fries', '1 large order', None),
    ('sv', '2709461', '1 kids meal order',
     'French fries, fast food, small', 'fast-food', 0, 'fries', '1 small order', None),
    ('sv', '2706889', '1 cheeseburger',
     'Cheeseburger, fast food, small', 'fast-food', 0, 'burger', '1 cheeseburger', None),
    ('sv', '2706897', '1 cheeseburger',
     'Cheeseburger, fast food, medium', 'fast-food', 0, 'burger', '1 cheeseburger', None),
    ('sv', '2706093', '1 nugget',
     'Chicken nugget, fast food', 'fast-food', 1, 'nuggets', '1 nugget', None),
    ('sv', '2708515', '1 small/regular',
     'Beef taco, corn tortilla, cheese', 'mexican', 1, 'taco', '1 regular taco', None),
    ('sv', '2708514', '1 large',
     'Taco, large', 'mexican', 0, '', '1 large taco', None),
    ('sv', '2710386', '1 cup (8 fl oz)',
     'Latte', 'drink', 1, 'coffee starbucks', '8 fl oz', None),
    ('sv', '2710386', '1 medium',
     'Latte, medium', 'drink', 0, 'coffee', '1 medium', None),
    ('sv', '2710472', '1 cup (8 fl oz)',
     'Cappuccino', 'drink', 0, 'coffee', '8 fl oz', None),
    ('sv', '2709188', '1 bottle (12 fl oz)',
     'Orange juice', 'drink', 1, 'oj', '12 fl oz', None),
    ('sv', '2709320', '1 bottle (10 fl oz)',
     'Apple juice', 'drink', 0, '', '10 fl oz', None),
    ('sv', '2710742', '1 scoop Gold Standard',
     'Whey protein powder, Gold Standard scoop', 'gym', 1, 'optimum nutrition on whey protein', '1 scoop (20.5 g)', None),
    ('sv', '2710731', '1 scoop EAS Whey',
     'EAS whey protein powder', 'gym', 0, 'whey protein', '1 scoop (19.5 g)', None),
    ('sv', '2708122', '1 bar',
     'Protein bar (Marathon)', 'gym', 0, 'protein bar', '1 bar', None),
]

# Avocado pick uses the whole-fruit portion then we halve it below via name flag.
HALF = {'Avocado'}

CHAINS = [
    ("MCDONALD'S", 'fast-food', "McDonald's", 'mcd mcdonalds'),
    ('BURGER KING', 'fast-food', 'Burger King', 'bk'),
    ("WENDY'S", 'fast-food', "Wendy's", 'wendys'),
    ('PIZZA HUT', 'pizza', 'Pizza Hut', 'pizzahut'),
    ("DOMINO'S", 'pizza', "Domino's", 'dominos dominoes'),
    ("PAPA JOHN'S", 'pizza', "Papa John's", 'papa johns'),
    ('LITTLE CAESARS', 'pizza', 'Little Caesars', 'little caesars'),
    ('TACO BELL', 'mexican', 'Taco Bell', 'tacobell'),
    ('SUBWAY', 'sandwich', 'Subway', 'sub'),
    ('KFC', 'fast-food', 'KFC', 'kentucky'),
    ('POPEYES', 'fast-food', 'Popeyes', 'popeye'),
    ('CHICK-FIL-A', 'fast-food', 'Chick-fil-A', 'cfa chickfila chick fil a'),
]

CHIPOTLE = [
    # name, serving label, grams or None, p, c, f, kcal, pop
    ('Chipotle flour tortilla, burrito', '1 tortilla', None, 8, 50, 9, 320, 0),
    ('Chipotle flour tortilla, taco', '1 tortilla', None, 2, 13, 2.5, 80, 0),
    ('Chipotle crispy corn tortilla', '1 tortilla', None, 1, 10, 3, 70, 0),
    ('Chipotle cilantro-lime brown rice', '4 oz', 113.4, 4, 36, 6, 210, 0),
    ('Chipotle cilantro-lime white rice', '4 oz', 113.4, 4, 40, 4, 210, 1),
    ('Chipotle black beans', '4 oz', 113.4, 8, 22, 1.5, 130, 1),
    ('Chipotle pinto beans', '4 oz', 113.4, 8, 21, 1.5, 130, 0),
    ('Chipotle fajita vegetables', '2 oz', 56.7, 1, 5, 0, 20, 0),
    ('Chipotle barbacoa', '4 oz', 113.4, 24, 2, 7, 170, 0),
    ('Chipotle chicken', '4 oz', 113.4, 32, 0, 7, 180, 1),
    ('Chipotle carnitas', '4 oz', 113.4, 23, 0, 12, 210, 0),
    ('Chipotle steak', '4 oz', 113.4, 21, 1, 6, 150, 0),
    ('Chipotle sofritas', '4 oz', 113.4, 8, 9, 10, 150, 0),
    ('Chipotle fresh tomato salsa', '4 oz', 113.4, 0, 4, 0, 25, 0),
    ('Chipotle roasted chili-corn salsa', '4 oz', 113.4, 3, 16, 1.5, 80, 0),
    ('Chipotle tomatillo-green chili salsa', '2 fl oz', None, 0, 4, 0, 15, 0),
    ('Chipotle tomatillo-red chili salsa', '2 fl oz', None, 0, 4, 0, 30, 0),
    ('Chipotle cheese', '1 oz', 28.3, 6, 1, 8, 110, 1),
    ('Chipotle sour cream', '2 oz', 56.7, 2, 2, 9, 110, 0),
    ('Chipotle guacamole', '4 oz', 113.4, 2, 8, 22, 230, 1),
    ('Chipotle queso blanco', '2 oz', 56.7, 5, 4, 9, 120, 0),
    ('Chipotle romaine lettuce', '1 oz', 28.3, 0, 1, 0, 5, 0),
    ('Chipotle chips', '4 oz', 113.4, 7, 73, 25, 540, 0),
    ('Chipotle honey vinaigrette', '2 fl oz', None, 1, 18, 16, 220, 0),
]

BRANDED = [
    {'id': 'fdc-378251', 'name': 'Kirkland Signature chicken breast (Perdue Fit & Easy)', 'srv': '4 oz (112 g)', 'g': 112,
     'per100': {'p': 23.2, 'f': 0.89, 'c': 0.0, 'kcal': 107}, 'cat': 'gym', 'aka': 'costco chicken', 'pop': 1,
     'src': 'USDA Branded FDC 378251 (per 100 g; household serving 4 oz / 112 g)'},
    {'id': 'fdc-2087961', 'name': 'Kirkland Signature chocolate chunk cookie', 'srv': '1 cookie', 'g': 21,
     'per100': {'p': 4.76, 'f': 28.57, 'c': 57.14, 'kcal': 524}, 'cat': 'snack', 'aka': 'costco cookie', 'pop': 0,
     'src': 'USDA Branded FDC 2087961 (per 100 g; household serving 1 cookie / 21 g)'},
    {'id': 'fdc-2083367', 'name': 'Great Value Greek nonfat yogurt, peach', 'srv': '1 container (150 g)', 'g': 150,
     'per100': {'p': 8.0, 'f': 0.0, 'c': 13.3, 'kcal': 87}, 'cat': 'gym', 'aka': 'walmart yogurt', 'pop': 0,
     'src': 'USDA Branded FDC 2083367, Wal-Mart Stores (per 100 g; 1 container / 150 g)'},
    {'id': 'fdc-2083374', 'name': 'Great Value Greek nonfat yogurt, strawberry banana', 'srv': '1 container (150 g)', 'g': 150,
     'per100': {'p': 8.0, 'f': 0.0, 'c': 13.3, 'kcal': 87}, 'cat': 'gym', 'aka': 'walmart yogurt', 'pop': 0,
     'src': 'USDA Branded FDC 2083374, Wal-Mart Stores (per 100 g; 1 container / 150 g)'},
    {'id': 'fdc-2475031', 'name': 'Optimum Nutrition Gold Standard 100% Whey, packet', 'srv': '1 packet (30 g)', 'g': 30.4,
     'per100': {'p': 79.0, 'f': 3.29, 'c': 9.87, 'kcal': 395}, 'cat': 'gym', 'aka': 'whey protein on gold standard', 'pop': 1,
     'src': 'USDA Branded FDC 2475031 (per 100 g; household serving 1 packet / 30.4 g)'},
    {'id': 'fdc-2757397', 'name': 'Fairlife ultra-filtered milk', 'srv': '1 cup (240 g)', 'g': 240,
     'per100': {'p': 5.42, 'f': 1.04, 'c': 2.5, 'kcal': 41.7}, 'cat': 'gym', 'aka': 'fairlife milk', 'pop': 1,
     'src': 'USDA Branded FDC 2757397 (per 100 g; serving 240 g)'},
    {'id': 'fdc-2757704', 'name': 'Fairlife ultra-filtered whole milk', 'srv': '1 cup (240 g)', 'g': 240,
     'per100': {'p': 5.42, 'f': 3.33, 'c': 2.5, 'kcal': 62.5}, 'cat': 'drink', 'aka': 'fairlife milk', 'pop': 0,
     'src': 'USDA Branded FDC 2757704 (per 100 g; serving 240 g)'},
    {'id': 'fdc-2117681', 'name': 'Premier Protein bar', 'srv': '1 bar (72 g)', 'g': 72,
     'abs': {'p': 30.0, 'c': 25.0, 'f': 8.0, 'kcal': 290}, 'cat': 'gym', 'aka': 'protein bar', 'pop': 1,
     'src': 'USDA Branded FDC 2117681 label nutrients (Premier Nutrition Corporation, 1 bar / 72 g)'},
]


def index(foods):
    by_desc, by_id = {}, {}
    for f in foods:
        by_desc.setdefault(f['description'], f)
        by_id[str(f['fdcId'])] = f
    return by_desc, by_id


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:48]


def pizza_bits(desc):
    d = desc.lower()
    topping = 'Cheese'
    for key, title in (('pepperoni', 'Pepperoni'), ('sausage', 'Sausage'), ('super supreme', 'Super Supreme'),
                       ('the works', 'The Works'), ('meat and vegetable', 'Meat and vegetable')):
        if key in d:
            topping = title
            break
    size = re.search(r'(\d+)\s*"', desc)
    crust = ''
    for key, title in (("thin 'n crispy", 'thin'), ('crunchy thin', 'thin'), ('hand-tossed', 'hand-tossed'),
                       ('pan crust', 'pan'), ('thin crust', 'thin'), ('stuffed', 'stuffed crust'),
                       ('deep dish', 'deep dish'), ('original crust', 'original'), ('regular crust', 'regular')):
        if key in d:
            crust = title
            break
    size_s = f'{size.group(1)}" ' if size else ''
    return topping, size_s, crust


def chain_names(desc, brand):
    if 'pizza' in desc.lower():
        topping, size_s, crust = pizza_bits(desc)
        name = f'{topping} pizza, {brand} {size_s}{crust}'.replace('  ', ' ').strip()
        srv = f'1 slice ({(size_s + crust).strip()})' if (size_s or crust) else '1 slice'
        return name, srv
    rest = desc
    for raw, _cat, nice, _aka in CHAINS:
        if desc.upper().startswith(raw):
            rest = desc[len(raw):].lstrip(" ,'-")
            while rest.upper().startswith(raw):
                rest = rest[len(raw):].lstrip(" ,'-")
            break
    def title_word(w):
        if '.' in w or any(ch.isdigit() for ch in w):
            return w
        return w.capitalize() if w.isupper() else w
    titled = ' '.join(title_word(w) for w in rest.split())
    for a, b in (('Mcnuggets', 'McNuggets'), ('Mcmuffin', 'McMuffin'), ('Mcchicken', 'McChicken'),
                 ('Mcflurry', 'McFlurry'), ('Mcgriddles', 'McGriddles'), ('Big Mac', 'Big Mac'),
                 ('Filet-O-Fish', 'Filet-O-Fish'), ('Whopper', 'Whopper')):
        titled = re.sub(a, b, titled, flags=re.I)
    return f'{brand} {titled}'.strip(), None


def choose_chain_portion(food):
    ports = portions(food)
    if not ports:
        return None
    desc = food['description'].lower()
    if 'pizza' in desc:
        slices = [p for p in ports if 'slice' in p['blob'] and p['g'] < 250]
        if slices:
            slices.sort(key=lambda p: (0 if p['modifier'].lower() == 'slice' else 1, p['g']))
            return slices[0]
    def score(p):
        t = p['blob']
        s = 0
        if any(w in t for w in ('sandwich', 'burger', 'sub', 'taco', 'burrito', 'item', 'piece', 'serving', 'cookie', 'cone', 'wing', 'strip', 'nugget', 'order', 'slice')):
            s -= 40
        if 'pie' in t or p['modifier'].lower() == 'pizza':
            s += 80
        if 25 <= p['g'] <= 400:
            s -= 10
        if p['g'] > 600:
            s += 50
        return (s, abs(p['g'] - 140))
    return sorted(ports, key=score)[0]


def add_item(rows, seen, item):
    ok, exp, diff = consistent(item)
    if not ok:
        print(f"DROP kcal {item['name']}: label {item['kcal']} vs 4/4/9 {exp:.0f} (diff {diff:.0f})")
        return False
    if item['id'] in seen:
        print('DUP', item['id'], item['name'])
        return False
    seen.add(item['id'])
    rows.append(item)
    return True


def main():
    sr = load('FoodData_Central_sr_legacy_food_json_2018-04.json')['SRLegacyFoods']
    fd = load('FoodData_Central_foundation_food_json_2026-10-29.json')['FoundationFoods']
    sv = load('surveyDownload.json')['SurveyFoods']
    dbs = {'sr': index(sr), 'fd': index(fd), 'sv': index(sv)}
    rows, seen, misses = [], set(), []

    for db, key, spec, name, cat, pop, aka, srv_over, force_g in PICKS:
        by_desc, by_id = dbs[db]
        food = by_id.get(str(key)) or by_desc.get(key)
        if not food:
            misses.append(f'{db} {key[:70]}')
            continue
        portion = match_portion(food, spec)
        if not portion and force_g is None:
            misses.append(f'{db} portion {spec} :: {food["description"][:70]}')
            continue
        per = per100(food)
        grams = float(force_g) if force_g else (portion['g'] / 2 if name in HALF else portion['g'])
        if name in HALF and portion:
            grams = portion['g'] / 2
        scaled = scale(per, grams)
        if not scaled:
            misses.append(f'no energy {food["description"][:70]}')
            continue
        srv = srv_over or (nice_qty(portion) if portion else f'{grams:g} g')
        src = f'USDA {food.get("dataType") or db} FDC {food["fdcId"]}'
        item = {'id': f'{db}-{food["fdcId"]}-{slug(name)}', 'name': name, 'srv': srv, 'g': round(grams, 1),
                'p': scaled['p'], 'c': scaled['c'], 'f': scaled['f'], 'kcal': scaled['kcal'],
                'cat': cat, 'src': src}
        if scaled.get('a'):
            item['a'] = scaled['a']
        if pop:
            item['pop'] = 1
        if aka:
            item['aka'] = aka
        add_item(rows, seen, item)

    for food in sr:
        desc = food['description']
        if 'without' in desc.lower():
            continue
        hit = None
        for raw, cat, brand, aka in CHAINS:
            if desc.upper().startswith(raw):
                hit = (cat, brand, aka)
                break
        if not hit:
            continue
        cat, brand, aka = hit
        portion = choose_chain_portion(food)
        if not portion or portion['g'] > 500:
            print('SKIP chain portion', desc[:80], None if not portion else portion['g'])
            continue
        per = per100(food)
        scaled = scale(per, portion['g'])
        if not scaled:
            print('SKIP no energy', desc[:80])
            continue
        name, pizza_srv = chain_names(desc, brand)
        srv = pizza_srv or nice_qty(portion)
        item = {'id': f'sr-{food["fdcId"]}', 'name': name, 'srv': srv, 'g': round(portion['g'], 1),
                'p': scaled['p'], 'c': scaled['c'], 'f': scaled['f'], 'kcal': scaled['kcal'],
                'cat': cat, 'aka': aka, 'src': f'USDA SR Legacy FDC {food["fdcId"]}'}
        if scaled.get('a'):
            item['a'] = scaled['a']
        low = name.lower()
        if any(s in low for s in ('big mac', 'chick-fil-a chicken sandwich', 'french fries', 'whopper')) and 'without' not in low:
            if 'double' not in low and 'snack' not in low:
                item['pop'] = 1
        add_item(rows, seen, item)

    for name, srv, grams, p, c, f, kcal, pop in CHIPOTLE:
        item = {'id': 'chipotle-' + slug(name), 'name': name, 'srv': srv, 'g': grams,
                'p': p, 'c': c, 'f': f, 'kcal': kcal, 'cat': 'mexican', 'aka': 'chipotle bowl',
                'src': 'Chipotle US nutrition facts paper menu, OCT-2024-US-CK'}
        if pop:
            item['pop'] = 1
        add_item(rows, seen, item)

    for b in BRANDED:
        if 'abs' in b:
            scaled = dict(b['abs'])
        else:
            scaled = scale(b['per100'], b['g'])
        item = {'id': b['id'], 'name': b['name'], 'srv': b['srv'], 'g': b['g'],
                'p': scaled['p'], 'c': scaled['c'], 'f': scaled['f'], 'kcal': scaled['kcal'],
                'cat': b['cat'], 'src': b['src']}
        if b.get('aka'):
            item['aka'] = b['aka']
        if b.get('pop'):
            item['pop'] = 1
        add_item(rows, seen, item)

    if misses:
        print('MISSES', len(misses))
        for m in misses:
            print(' ', m)
        sys.exit(1)

    rows.sort(key=lambda r: (r['cat'], r['name'], r['id']))
    lines = ['/* Common foods for Lift Log. Generated by tools/build_foods.py. See FOODS_NOTICE.md. */',
             'window.FOOD_DB = [']
    for r in rows:
        lines.append(json.dumps(r, ensure_ascii=False, separators=(',', ':')) + ',')
    lines.append('];')
    lines.append('')
    OUT.write_text('\n'.join(lines))
    from collections import Counter
    print('wrote', OUT, 'foods', len(rows))
    print(Counter(r['cat'] for r in rows))
    print('--- pepperoni ---')
    for r in rows:
        if 'pepperoni pizza' in r['name'].lower():
            print(f"  {r['kcal']:4}  P{r['p']:5} C{r['c']:5} F{r['f']:5}  {r['g']}g  {r['srv']}  {r['name']}")


if __name__ == '__main__':
    main()
