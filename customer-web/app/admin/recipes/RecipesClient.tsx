'use client';

import { useState, useCallback } from 'react';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  sku: string;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
}

interface RecipeLine {
  id: string;
  quantity: number;
  ingredient_id: string;
  ingredients: { id: string; name: string; unit: string };
}

const UNITS = ['g', 'kg', 'ml', 'L', 'pcs', 'tbsp', 'tsp', 'cup'];

const inputClass = 'bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#E4002B]/50 transition-colors rounded-sm font-body w-full';

export function RecipesClient({
  initialMenuItems,
  initialIngredients,
}: {
  initialMenuItems: MenuItem[];
  initialIngredients: Ingredient[];
}) {
  const [ingredients, setIngredients]       = useState<Ingredient[]>(initialIngredients);
  const [selectedItem, setSelectedItem]     = useState<MenuItem | null>(null);
  const [recipe, setRecipe]                 = useState<RecipeLine[]>([]);
  const [recipeLoading, setRecipeLoading]   = useState(false);
  const [search, setSearch]                 = useState('');

  // Ingredient form
  const [ingName, setIngName]   = useState('');
  const [ingUnit, setIngUnit]   = useState('g');
  const [ingLoading, setIngLoading] = useState(false);
  const [ingError, setIngError] = useState<string | null>(null);
  const [showIngForm, setShowIngForm] = useState(false);

  // Add-to-recipe form
  const [addIngId, setAddIngId]   = useState('');
  const [addQty, setAddQty]       = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const loadRecipe = useCallback(async (item: MenuItem) => {
    setSelectedItem(item);
    setRecipeLoading(true);
    const res = await fetch(`/api/admin/recipes?menu_item_id=${item.id}`);
    if (res.ok) setRecipe(await res.json());
    setRecipeLoading(false);
  }, []);

  async function createIngredient(e: React.FormEvent) {
    e.preventDefault();
    setIngLoading(true); setIngError(null);
    const res = await fetch('/api/admin/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: ingName, unit: ingUnit }),
    });
    const data = await res.json();
    setIngLoading(false);
    if (!res.ok) { setIngError(data.detail); return; }
    setIngredients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setIngName(''); setIngUnit('g');
    setShowIngForm(false);
    showToast(`Ingredient "${data.name}" added`);
  }

  async function deleteIngredient(id: string, name: string) {
    const res = await fetch(`/api/admin/ingredients/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setIngredients(prev => prev.filter(i => i.id !== id));
      setRecipe(prev => prev.filter(r => r.ingredient_id !== id));
      showToast(`"${name}" deleted`);
    }
  }

  async function addToRecipe(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem || !addIngId || !addQty) return;
    setAddLoading(true);
    const res = await fetch('/api/admin/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menu_item_id: selectedItem.id, ingredient_id: addIngId, quantity: parseFloat(addQty) }),
    });
    const data = await res.json();
    setAddLoading(false);
    if (!res.ok) { showToast(data.detail ?? 'Failed'); return; }
    setRecipe(prev => {
      const exists = prev.find(r => r.ingredient_id === addIngId);
      if (exists) return prev.map(r => r.ingredient_id === addIngId ? data : r);
      return [...prev, data];
    });
    setAddIngId(''); setAddQty('');
    showToast('Added to recipe');
  }

  async function updateQty(recipeId: string, quantity: number) {
    const res = await fetch(`/api/admin/recipes/${recipeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    });
    if (res.ok) {
      setRecipe(prev => prev.map(r => r.id === recipeId ? { ...r, quantity } : r));
    }
  }

  async function removeFromRecipe(recipeId: string) {
    const res = await fetch(`/api/admin/recipes/${recipeId}`, { method: 'DELETE' });
    if (res.ok) setRecipe(prev => prev.filter(r => r.id !== recipeId));
  }

  // Group menu items by category
  const categories = Array.from(new Set(initialMenuItems.map(i => i.category)));
  const filtered = initialMenuItems.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 sm:px-8 py-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#E4002B] text-white font-heading text-xs tracking-widest px-5 py-2.5 rounded-sm shadow-xl pointer-events-none">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-1">KITCHEN</p>
          <h1 className="font-heading text-3xl text-white">RECIPES</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT: Ingredients master list ── */}
        <div className="lg:col-span-1 space-y-4">
          <div className="border border-white/5 rounded-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-heading text-xs tracking-widest text-white/40">
                INGREDIENTS ({ingredients.length})
              </h2>
              <button
                onClick={() => setShowIngForm(v => !v)}
                className="font-heading text-[10px] tracking-widest px-3 py-1.5 bg-[#E4002B] text-white hover:bg-red-700 rounded-sm transition-colors"
              >
                + ADD
              </button>
            </div>

            {showIngForm && (
              <form onSubmit={createIngredient} className="px-4 py-3 border-b border-white/5 bg-[#0d0d0d] space-y-2">
                <input
                  value={ingName}
                  onChange={e => setIngName(e.target.value)}
                  placeholder="Ingredient name"
                  required
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <select
                    value={ingUnit}
                    onChange={e => setIngUnit(e.target.value)}
                    className={inputClass + ' cursor-pointer'}
                  >
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <button
                    type="submit"
                    disabled={ingLoading}
                    className="font-heading text-[10px] tracking-widest px-4 py-2 bg-[#E4002B] text-white hover:bg-red-700 disabled:opacity-50 rounded-sm flex-shrink-0 transition-colors"
                  >
                    {ingLoading ? '…' : 'SAVE'}
                  </button>
                </div>
                {ingError && <p className="text-[#E4002B] font-heading text-[10px]">{ingError}</p>}
              </form>
            )}

            <div className="max-h-[500px] overflow-y-auto divide-y divide-white/5">
              {ingredients.length === 0 ? (
                <div className="px-4 py-10 text-center font-heading text-xs tracking-widest text-white/20">
                  NO INGREDIENTS YET
                </div>
              ) : ingredients.map(ing => (
                <div key={ing.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] group">
                  <div>
                    <p className="font-heading text-xs text-white">{ing.name}</p>
                    <p className="font-heading text-[10px] text-white/30 mt-0.5 uppercase">{ing.unit}</p>
                  </div>
                  <button
                    onClick={() => deleteIngredient(ing.id, ing.name)}
                    className="font-heading text-[9px] tracking-widest text-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all px-2 py-1 border border-transparent hover:border-red-500/30 rounded-sm"
                  >
                    DEL
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Menu item selector + recipe editor ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Menu item search + list */}
          <div className="border border-white/5 rounded-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search menu items…"
                className={inputClass}
              />
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-white/5">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center font-heading text-xs tracking-widest text-white/20">NO ITEMS FOUND</div>
              ) : filtered.map(item => (
                <button
                  key={item.id}
                  onClick={() => loadRecipe(item)}
                  className={`w-full text-left flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors ${
                    selectedItem?.id === item.id ? 'bg-[#E4002B]/10 border-l-2 border-[#E4002B]' : ''
                  }`}
                >
                  <div>
                    <p className="font-heading text-xs text-white">{item.name}</p>
                    <p className="font-heading text-[10px] text-white/30 mt-0.5 uppercase">{item.category}</p>
                  </div>
                  <span className="font-heading text-[9px] text-white/20 tracking-widest">
                    {selectedItem?.id === item.id ? 'EDITING →' : 'SELECT'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Recipe editor */}
          {selectedItem ? (
            <div className="border border-white/5 rounded-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 bg-[#E4002B]/5">
                <p className="font-heading text-[10px] tracking-widest text-[#E4002B] mb-0.5">RECIPE FOR</p>
                <h2 className="font-heading text-sm text-white">{selectedItem.name}</h2>
              </div>

              {/* Add ingredient to recipe */}
              <form onSubmit={addToRecipe} className="px-4 py-3 border-b border-white/5 bg-[#0d0d0d]">
                <p className="font-heading text-[10px] tracking-widest text-white/30 mb-2">ADD INGREDIENT</p>
                <div className="flex gap-2">
                  <select
                    value={addIngId}
                    onChange={e => setAddIngId(e.target.value)}
                    required
                    className={inputClass + ' cursor-pointer flex-1'}
                  >
                    <option value="">Select ingredient…</option>
                    {ingredients.map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={addQty}
                    onChange={e => setAddQty(e.target.value)}
                    placeholder="Qty"
                    required
                    className={inputClass + ' w-24'}
                  />
                  <button
                    type="submit"
                    disabled={addLoading}
                    className="font-heading text-[10px] tracking-widest px-4 py-2 bg-[#E4002B] text-white hover:bg-red-700 disabled:opacity-50 rounded-sm flex-shrink-0 transition-colors"
                  >
                    {addLoading ? '…' : 'ADD'}
                  </button>
                </div>
              </form>

              {/* Recipe lines */}
              {recipeLoading ? (
                <div className="px-4 py-10 text-center font-heading text-xs tracking-widest text-white/20 animate-pulse">LOADING…</div>
              ) : recipe.length === 0 ? (
                <div className="px-4 py-10 text-center font-heading text-xs tracking-widest text-white/20">
                  NO INGREDIENTS IN RECIPE YET
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {recipe.map(line => (
                    <div key={line.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <p className="font-heading text-xs text-white">{line.ingredients.name}</p>
                        <span className="font-heading text-[10px] text-white/30 uppercase">{line.ingredients.unit}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          defaultValue={line.quantity}
                          onBlur={e => {
                            const val = parseFloat(e.target.value);
                            if (val > 0 && val !== line.quantity) updateQty(line.id, val);
                          }}
                          className="w-20 bg-[#1a1a1a] border border-white/10 px-2 py-1 text-xs text-white text-right focus:outline-none focus:border-[#E4002B]/40 rounded-sm font-body"
                        />
                        <button
                          onClick={() => removeFromRecipe(line.id)}
                          className="font-heading text-[9px] tracking-widest text-white/20 hover:text-red-400 px-2 py-1 border border-transparent hover:border-red-500/30 rounded-sm transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="border border-white/5 rounded-sm px-4 py-16 text-center">
              <p className="font-heading text-xs tracking-widest text-white/20">SELECT A MENU ITEM TO EDIT ITS RECIPE</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
