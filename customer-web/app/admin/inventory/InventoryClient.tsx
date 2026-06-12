'use client';

import { useState } from 'react';

interface IngredientStock {
  id: string;
  name: string;
  unit: string;
  stock_qty: number;
  low_stock_threshold: number;
  low_stock: boolean;
  updated_at: string;
}

const UNITS = ['kg', 'g', 'L', 'ml', 'pcs', 'packets', 'boxes', 'bottles'];

const inputClass = 'bg-[#1a1a1a] border border-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#E4002B]/40 rounded-sm font-body w-full';

// ── STOCK TAB ──────────────────────────────────────────────────────────────

function StockTab({ initialIngredients }: { initialIngredients: IngredientStock[] }) {
  const [ingredients, setIngredients] = useState<IngredientStock[]>(initialIngredients);
  const [editing, setEditing]         = useState<string | null>(null);
  const [newQty, setNewQty]           = useState('');
  const [newThreshold, setNewThreshold] = useState('');
  const [note, setNote]               = useState('');
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState<string | null>(null);
  const [filter, setFilter]           = useState<'all' | 'low'>('all');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function startEdit(ing: IngredientStock) {
    setEditing(ing.id);
    setNewQty(String(ing.stock_qty));
    setNewThreshold(String(ing.low_stock_threshold));
    setNote('');
  }

  async function saveStock(id: string) {
    setSaving(true);
    const res = await fetch(`/api/admin/inventory/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stock_qty: parseFloat(newQty),
        low_stock_threshold: parseFloat(newThreshold),
        note: note.trim() || null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { showToast(data.detail ?? 'Failed'); return; }
    setIngredients(prev => prev.map(i => i.id === id ? { ...data, low_stock: data.stock_qty <= data.low_stock_threshold } : i));
    setEditing(null);
    showToast('Stock updated');
  }

  const lowCount = ingredients.filter(i => i.low_stock).length;
  const displayed = filter === 'low' ? ingredients.filter(i => i.low_stock) : ingredients;

  return (
    <>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#E4002B] text-white font-heading text-xs tracking-widest px-5 py-2.5 rounded-sm shadow-xl pointer-events-none">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {(['all', 'low'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`font-heading text-xs tracking-widest px-4 py-2 rounded-sm border transition-colors ${
                filter === f ? 'bg-[#E4002B] border-[#E4002B] text-white' : 'border-white/10 text-white/30 hover:text-white'
              }`}
            >
              {f === 'all' ? `ALL (${ingredients.length})` : `LOW STOCK (${lowCount})`}
            </button>
          ))}
        </div>
        {lowCount > 0 && (
          <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-sm px-4 py-2 text-center">
            <p className="font-heading text-2xl text-yellow-400">{lowCount}</p>
            <p className="font-heading text-[10px] tracking-widest text-yellow-400/60">LOW STOCK</p>
          </div>
        )}
      </div>

      <div className="border border-white/5 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-heading">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 tracking-widest text-white/30">INGREDIENT</th>
                <th className="text-left px-4 py-3 tracking-widest text-white/30">UNIT</th>
                <th className="text-right px-4 py-3 tracking-widest text-white/30">STOCK QTY</th>
                <th className="text-right px-4 py-3 tracking-widest text-white/30">LOW THRESHOLD</th>
                <th className="text-center px-4 py-3 tracking-widest text-white/30">STATUS</th>
                <th className="text-right px-4 py-3 tracking-widest text-white/30">LAST UPDATED</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-white/20 tracking-widest">
                    {filter === 'low' ? 'NO LOW STOCK ITEMS' : 'NO INGREDIENTS YET — ADD THEM IN THE INGREDIENTS TAB'}
                  </td>
                </tr>
              ) : displayed.map(ing => (
                <>
                  <tr key={ing.id} className={`hover:bg-white/[0.02] transition-colors ${ing.low_stock ? 'bg-yellow-500/[0.03]' : ''}`}>
                    <td className="px-5 py-3 text-white font-heading">{ing.name}</td>
                    <td className="px-4 py-3 text-white/40 uppercase">{ing.unit}</td>
                    <td className={`px-4 py-3 text-right font-heading ${ing.low_stock ? 'text-yellow-400' : 'text-white'}`}>
                      {ing.stock_qty}
                    </td>
                    <td className="px-4 py-3 text-right text-white/40">{ing.low_stock_threshold}</td>
                    <td className="px-4 py-3 text-center">
                      {ing.low_stock ? (
                        <span className="font-heading text-[9px] tracking-widest px-2 py-1 border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 rounded-sm">LOW</span>
                      ) : (
                        <span className="font-heading text-[9px] tracking-widest px-2 py-1 border border-green-500/20 bg-green-500/5 text-green-400/60 rounded-sm">OK</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-white/20 text-[10px]">
                      {new Date(ing.updated_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => editing === ing.id ? setEditing(null) : startEdit(ing)}
                        className="font-heading text-[10px] tracking-widest px-3 py-1.5 border border-white/10 text-white/30 hover:text-white hover:border-white/30 rounded-sm transition-colors"
                      >
                        {editing === ing.id ? 'CANCEL' : 'UPDATE'}
                      </button>
                    </td>
                  </tr>

                  {editing === ing.id && (
                    <tr key={ing.id + '-edit'} className="bg-[#0d0d0d]">
                      <td colSpan={7} className="px-5 py-4">
                        <div className="flex flex-wrap gap-3 items-end">
                          <div>
                            <p className="font-heading text-[10px] tracking-widest text-white/30 mb-1.5">NEW STOCK QTY ({ing.unit})</p>
                            <input type="number" step="0.01" min="0" value={newQty} onChange={e => setNewQty(e.target.value)} className={inputClass + ' w-32'} />
                          </div>
                          <div>
                            <p className="font-heading text-[10px] tracking-widest text-white/30 mb-1.5">LOW STOCK THRESHOLD</p>
                            <input type="number" step="0.01" min="0" value={newThreshold} onChange={e => setNewThreshold(e.target.value)} className={inputClass + ' w-32'} />
                          </div>
                          <div className="flex-1 min-w-40">
                            <p className="font-heading text-[10px] tracking-widest text-white/30 mb-1.5">NOTE (OPTIONAL)</p>
                            <input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Restocked from supplier" className={inputClass} />
                          </div>
                          <button
                            onClick={() => saveStock(ing.id)}
                            disabled={saving}
                            className="font-heading text-[10px] tracking-widest px-5 py-2 bg-[#E4002B] text-white hover:bg-red-700 disabled:opacity-50 rounded-sm transition-colors flex-shrink-0"
                          >
                            {saving ? 'SAVING…' : 'SAVE'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── INGREDIENTS TAB ────────────────────────────────────────────────────────

interface Ingredient {
  id: string;
  name: string;
  unit: string;
}

function IngredientsTab() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loaded, setLoaded]           = useState(false);
  const [loading, setLoading]         = useState(false);
  const [toast, setToast]             = useState<string | null>(null);

  // add form
  const [addName, setAddName] = useState('');
  const [addUnit, setAddUnit] = useState('kg');
  const [adding, setAdding]   = useState(false);

  // edit
  const [editId, setEditId]     = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/ingredients');
    if (res.ok) setIngredients(await res.json());
    setLoaded(true);
    setLoading(false);
  }

  // load on first render of this tab
  if (!loaded && !loading) load();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim()) return;
    setAdding(true);
    const res = await fetch('/api/admin/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: addName.trim(), unit: addUnit }),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) { showToast(data.detail ?? 'Failed'); return; }
    setIngredients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setAddName('');
    setAddUnit('kg');
    showToast('Ingredient added');
  }

  function startEdit(ing: Ingredient) {
    setEditId(ing.id);
    setEditName(ing.name);
    setEditUnit(ing.unit);
    setDeleteId(null);
  }

  async function saveEdit() {
    if (!editId) return;
    setEditSaving(true);
    const res = await fetch(`/api/admin/ingredients/${editId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), unit: editUnit }),
    });
    const data = await res.json();
    setEditSaving(false);
    if (!res.ok) { showToast(data.detail ?? 'Failed'); return; }
    setIngredients(prev => prev.map(i => i.id === editId ? data : i).sort((a, b) => a.name.localeCompare(b.name)));
    setEditId(null);
    showToast('Ingredient updated');
  }

  async function confirmDelete(id: string) {
    setDeleting(true);
    const res = await fetch(`/api/admin/ingredients/${id}`, { method: 'DELETE' });
    setDeleting(false);
    if (!res.ok) { showToast('Failed to delete'); return; }
    setIngredients(prev => prev.filter(i => i.id !== id));
    setDeleteId(null);
    showToast('Ingredient deleted');
  }

  return (
    <>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#E4002B] text-white font-heading text-xs tracking-widest px-5 py-2.5 rounded-sm shadow-xl pointer-events-none">
          {toast}
        </div>
      )}

      {/* Add ingredient form */}
      <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end mb-6 border border-white/5 bg-[#111] rounded-sm px-5 py-4">
        <div className="flex-1 min-w-48">
          <p className="font-heading text-[10px] tracking-widest text-white/30 mb-1.5">INGREDIENT NAME</p>
          <input
            value={addName}
            onChange={e => setAddName(e.target.value)}
            placeholder="e.g. Chicken Breast"
            className={inputClass}
            required
          />
        </div>
        <div>
          <p className="font-heading text-[10px] tracking-widest text-white/30 mb-1.5">UNIT</p>
          <select
            value={addUnit}
            onChange={e => setAddUnit(e.target.value)}
            className={inputClass + ' w-28'}
          >
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <button
          type="submit"
          disabled={adding}
          className="font-heading text-[10px] tracking-widest px-5 py-2 bg-[#E4002B] text-white hover:bg-red-700 disabled:opacity-50 rounded-sm transition-colors flex-shrink-0"
        >
          {adding ? 'ADDING…' : '+ ADD INGREDIENT'}
        </button>
      </form>

      {/* Ingredients list */}
      <div className="border border-white/5 rounded-sm overflow-hidden">
        <table className="w-full text-xs font-heading">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 tracking-widest text-white/30">NAME</th>
              <th className="text-left px-4 py-3 tracking-widest text-white/30">UNIT</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan={3} className="px-5 py-10 text-center text-white/20 tracking-widest">LOADING…</td></tr>
            ) : ingredients.length === 0 ? (
              <tr><td colSpan={3} className="px-5 py-10 text-center text-white/20 tracking-widest">NO INGREDIENTS YET</td></tr>
            ) : ingredients.map(ing => (
              <>
                <tr key={ing.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-white">{ing.name}</td>
                  <td className="px-4 py-3 text-white/40 uppercase">{ing.unit}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => editId === ing.id ? setEditId(null) : startEdit(ing)}
                        className="font-heading text-[10px] tracking-widest px-3 py-1.5 border border-white/10 text-white/30 hover:text-white hover:border-white/30 rounded-sm transition-colors"
                      >
                        {editId === ing.id ? 'CANCEL' : 'EDIT'}
                      </button>
                      <button
                        onClick={() => setDeleteId(deleteId === ing.id ? null : ing.id)}
                        className="font-heading text-[10px] tracking-widest px-3 py-1.5 border border-red-500/20 text-red-400/50 hover:text-red-400 hover:border-red-500/50 rounded-sm transition-colors"
                      >
                        DELETE
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Edit row */}
                {editId === ing.id && (
                  <tr key={ing.id + '-edit'} className="bg-[#0d0d0d]">
                    <td colSpan={3} className="px-5 py-4">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div className="flex-1 min-w-48">
                          <p className="font-heading text-[10px] tracking-widest text-white/30 mb-1.5">NAME</p>
                          <input value={editName} onChange={e => setEditName(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                          <p className="font-heading text-[10px] tracking-widest text-white/30 mb-1.5">UNIT</p>
                          <select value={editUnit} onChange={e => setEditUnit(e.target.value)} className={inputClass + ' w-28'}>
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <button
                          onClick={saveEdit}
                          disabled={editSaving}
                          className="font-heading text-[10px] tracking-widest px-5 py-2 bg-[#E4002B] text-white hover:bg-red-700 disabled:opacity-50 rounded-sm transition-colors"
                        >
                          {editSaving ? 'SAVING…' : 'SAVE'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {/* Delete confirm row */}
                {deleteId === ing.id && (
                  <tr key={ing.id + '-delete'} className="bg-red-950/30">
                    <td colSpan={3} className="px-5 py-3">
                      <div className="flex items-center gap-4">
                        <p className="font-heading text-xs text-red-400">Delete &quot;{ing.name}&quot;? This will also remove it from all recipes.</p>
                        <button
                          onClick={() => confirmDelete(ing.id)}
                          disabled={deleting}
                          className="font-heading text-[10px] tracking-widest px-4 py-1.5 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 rounded-sm transition-colors"
                        >
                          {deleting ? 'DELETING…' : 'CONFIRM DELETE'}
                        </button>
                        <button
                          onClick={() => setDeleteId(null)}
                          className="font-heading text-[10px] tracking-widest text-white/30 hover:text-white"
                        >
                          CANCEL
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────

export function InventoryClient({ initialIngredients }: { initialIngredients: IngredientStock[] }) {
  const [tab, setTab] = useState<'stock' | 'ingredients'>('stock');

  return (
    <div className="px-4 sm:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="font-heading text-xs tracking-[0.4em] text-[#E4002B] mb-1">KITCHEN</p>
        <h1 className="font-heading text-3xl text-white">INVENTORY</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-white/5">
        {(['stock', 'ingredients'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`font-heading text-xs tracking-widest px-5 py-3 border-b-2 transition-colors -mb-px ${
              tab === t
                ? 'border-[#E4002B] text-white'
                : 'border-transparent text-white/30 hover:text-white'
            }`}
          >
            {t === 'stock' ? 'STOCK LEVELS' : 'INGREDIENTS'}
          </button>
        ))}
      </div>

      {tab === 'stock'
        ? <StockTab initialIngredients={initialIngredients} />
        : <IngredientsTab />
      }
    </div>
  );
}
