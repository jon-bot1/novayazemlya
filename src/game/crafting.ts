// Crafting system — combine valuables into higher-value items

export interface CraftingRecipe {
  id: string;
  name: string;
  icon: string;
  description: string;
  ingredients: { name: string; count: number }[];
  resultName: string;
  resultIcon: string;
  resultValue: number;
  resultDescription: string;
}

export const RECIPES: CraftingRecipe[] = [
  {
    id: 'radio',
    name: 'Field Radio',
    icon: '📻',
    description: 'Combine electronic parts into a working radio',
    ingredients: [{ name: 'Transistor', count: 1 }, { name: 'Radio Parts', count: 1 }, { name: 'Battery Pack', count: 1 }],
    resultName: 'Working Field Radio',
    resultIcon: '📡',
    resultValue: 500,
    resultDescription: 'Fully operational field radio — high value',
  },
  {
    id: 'medpack',
    name: 'Advanced Medpack',
    icon: '🏥',
    description: 'Combine medical supplies into a premium medpack',
    ingredients: [{ name: 'Bandage', count: 2 }, { name: 'Medkit', count: 1 }],
    resultName: 'Advanced Medpack',
    resultIcon: '💊',
    resultValue: 350,
    resultDescription: 'Premium medical kit — heals 60 HP',
  },
  {
    id: 'jewelry',
    name: 'Gold Jewelry Set',
    icon: '💎',
    description: 'Combine precious items into a luxury set',
    ingredients: [{ name: 'Gold Ring', count: 1 }, { name: 'Silver Chain', count: 1 }],
    resultName: 'Gold Jewelry Set',
    resultIcon: '💎',
    resultValue: 600,
    resultDescription: 'Exquisite jewelry set — extremely valuable',
  },
  {
    id: 'optics',
    name: 'Improvised Optics',
    icon: '🔭',
    description: 'Combine optical components into a scope',
    ingredients: [{ name: 'Binoculars', count: 1 }, { name: 'Camera Film', count: 1 }],
    resultName: 'Improvised Scope',
    resultIcon: '🔭',
    resultValue: 400,
    resultDescription: 'Homemade optical sight — decent quality',
  },
  {
    id: 'survival_kit',
    name: 'Survival Kit',
    icon: '🎒',
    description: 'Combine supplies into a compact survival kit',
    ingredients: [{ name: 'Ration Pack', count: 1 }, { name: 'Compass', count: 1 }, { name: 'Lighter', count: 1 }],
    resultName: 'Survival Kit',
    resultIcon: '🎒',
    resultValue: 350,
    resultDescription: 'All-in-one survival package',
  },
  {
    id: 'intel_package',
    name: 'Intel Package',
    icon: '📁',
    description: 'Compile intel items into a classified dossier',
    ingredients: [{ name: 'Dog Tags', count: 2 }, { name: 'Propaganda Poster', count: 1 }],
    resultName: 'Classified Dossier',
    resultIcon: '📁',
    resultValue: 450,
    resultDescription: 'Compiled intelligence package — very valuable',
  },
  {
    id: 'electronics',
    name: 'Electronics Bundle',
    icon: '🔌',
    description: 'Bundle spare electronics for sale',
    ingredients: [{ name: 'Broken Phone', count: 1 }, { name: 'Battery Pack', count: 1 }, { name: 'Transistor', count: 1 }],
    resultName: 'Electronics Bundle',
    resultIcon: '💻',
    resultValue: 450,
    resultDescription: 'Salvaged electronics — good trade value',
  },
  {
    id: 'fuel_cache',
    name: 'Fuel Reserve',
    icon: '⛽',
    description: 'Combine fuel sources',
    ingredients: [{ name: 'Fuel Canister', count: 2 }, { name: 'Vodka Bottle', count: 1 }],
    resultName: 'Fuel Reserve',
    resultIcon: '🛢️',
    resultValue: 500,
    resultDescription: 'Substantial fuel reserve — highly sought after',
  },
];

import { Item } from './types';

export function canCraft(recipe: CraftingRecipe, stashItems: Item[]): boolean {
  for (const ing of recipe.ingredients) {
    const count = stashItems.filter(i => i.name === ing.name).length;
    if (count < ing.count) return false;
  }
  return true;
}

export function craft(recipe: CraftingRecipe, stashItems: Item[]): { remaining: Item[]; result: Item } | null {
  if (!canCraft(recipe, stashItems)) return null;
  
  const remaining = [...stashItems];
  for (const ing of recipe.ingredients) {
    let toRemove = ing.count;
    for (let i = remaining.length - 1; i >= 0 && toRemove > 0; i--) {
      if (remaining[i].name === ing.name) {
        remaining.splice(i, 1);
        toRemove--;
      }
    }
  }

  const result: Item = {
    id: `crafted_${recipe.id}_${Date.now()}`,
    name: recipe.resultName,
    category: 'valuable',
    icon: recipe.resultIcon,
    weight: 1,
    value: recipe.resultValue,
    description: recipe.resultDescription,
  };

  return { remaining, result };
}
