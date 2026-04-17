"use client";

import { useState, useEffect } from "react";

interface Card {
  id: string;
  title: string;
  description?: string;
  order: number;
  dueDate?: string;
  columnId: string;
  creator: { id: string; name: string };
  assignee?: { id: string; name: string };
}

interface CardModalProps {
  card: Card;
  columnTitle: string;
  token: string;
  onClose: () => void;
  onUpdate: (updatedCard: Card) => void;
  onDelete: (cardId: string, columnId: string) => void;
}

export default function CardModal({
  card,
  columnTitle,
  token,
  onClose,
  onUpdate,
  onDelete,
}: CardModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [dueDate, setDueDate] = useState(
    card.dueDate ? new Date(card.dueDate).toISOString().split("T")[0] : ""
  );
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const save = async (overrides?: Partial<{ title: string; description: string; dueDate: string }>) => {
    setSaving(true);
    try {
      const body = {
        id: card.id,
        title: overrides?.title ?? title,
        description: overrides?.description ?? description,
        dueDate: overrides?.dueDate !== undefined ? overrides.dueDate : dueDate,
      };

      const res = await fetch("/api/cards", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updated = await res.json();
        onUpdate(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!confirm("Delete this card?")) return;
    onDelete(card.id, card.columnId);
    onClose();
  };

  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex-1 pr-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              in {columnTitle}
            </p>
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  setEditingTitle(false);
                  if (title !== card.title) save({ title });
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setEditingTitle(false);
                    save({ title });
                  }
                  if (e.key === "Escape") {
                    setTitle(card.title);
                    setEditingTitle(false);
                  }
                }}
                className="text-xl font-semibold text-gray-900 w-full border-b-2 border-indigo-500 outline-none pb-1"
              />
            ) : (
              <h2
                className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-indigo-600 transition-colors"
                onClick={() => setEditingTitle(true)}
              >
                {title}
              </h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5">

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Description
            </label>
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Add a description..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Due date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
              }}
              className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isOverdue
                  ? "border-red-200 text-red-500 bg-red-50"
                  : "border-gray-200 text-gray-900"
              }`}
            />
            {isOverdue && (
              <p className="text-xs text-red-500 mt-1">This card is overdue</p>
            )}
          </div>

          {/* Meta */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="text-xs uppercase tracking-wide font-medium w-20">Created by</span>
              <span className="text-gray-900 text-xs bg-gray-100 px-2 py-1 rounded-full">
                {card.creator.name}
              </span>
            </div>
            {card.assignee && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="text-xs uppercase tracking-wide font-medium w-20">Assigned to</span>
                <span className="text-indigo-600 text-xs bg-indigo-50 px-2 py-1 rounded-full">
                  {card.assignee.name}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
                onClick={() => save()}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
                onClick={handleDelete}
                className="text-sm text-white bg-red-500 hover:bg-red-600 transition-colors px-3 py-2 rounded-lg font-medium"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
