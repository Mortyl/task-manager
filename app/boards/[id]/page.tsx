"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { io, Socket } from "socket.io-client";

interface Card {
  id: string;
  title: string;
  description?: string;
  order: number;
  dueDate?: string;
  creator: { id: string; name: string };
  assignee?: { id: string; name: string };
}

interface Column {
  id: string;
  title: string;
  order: number;
  cards: Card[];
}

interface Board {
  id: string;
  title: string;
  description?: string;
  columns: Column[];
  owner: { id: string; name: string };
}

export default function BoardPage({ params }: { params: { id: string } }) {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);

  const [board, setBoard] = useState<Board | null>(null);
  const [fetching, setFetching] = useState(true);
  const [newCardTitle, setNewCardTitle] = useState<Record<string, string>>({});
  const [addingCard, setAddingCard] = useState<string | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (token) fetchBoard();
  }, [token]);

  useEffect(() => {
    if (!board || !token) return;

    const socket = io({ path: "/api/socket" });
    socketRef.current = socket;

    socket.emit("join-board", board.id);

    socket.on("card:created", (card: Card & { columnId: string }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === card.columnId
              ? { ...col, cards: [...col.cards, card] }
              : col
          ),
        };
      });
    });

    socket.on("card:deleted", ({ cardId, columnId }: { cardId: string; columnId: string }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId
              ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
              : col
          ),
        };
      });
    });

    socket.on("column:created", (column: Column) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return { ...prev, columns: [...prev.columns, { ...column, cards: [] }] };
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [board?.id, token]);

  const fetchBoard = async () => {
    try {
      const res = await fetch(`/api/boards/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { router.push("/boards"); return; }
      const data = await res.json();
      setBoard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const createCard = async (columnId: string) => {
    const title = newCardTitle[columnId]?.trim();
    if (!title) return;

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, columnId }),
      });
      const card = await res.json();
      if (!res.ok) return;

      socketRef.current?.emit("card:created", { ...card, boardId: board?.id });

      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
          ),
        };
      });

      setNewCardTitle((prev) => ({ ...prev, [columnId]: "" }));
      setAddingCard(null);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCard = async (cardId: string, columnId: string) => {
    try {
      await fetch(`/api/cards?id=${cardId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      socketRef.current?.emit("card:deleted", { cardId, columnId, boardId: board?.id });

      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === columnId
              ? { ...col, cards: col.cards.filter((c) => c.id !== cardId) }
              : col
          ),
        };
      });
    } catch (err) {
      console.error(err);
    }
  };

  const createColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnTitle.trim() || !board) return;

    try {
      const res = await fetch("/api/columns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newColumnTitle, boardId: board.id }),
      });
      const column = await res.json();
      if (!res.ok) return;

      socketRef.current?.emit("column:created", { ...column, boardId: board.id });

      setBoard((prev) => {
        if (!prev) return prev;
        return { ...prev, columns: [...prev.columns, { ...column, cards: [] }] };
      });

      setNewColumnTitle("");
      setAddingColumn(false);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!board) return null;

  const sortedColumns = [...board.columns].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/boards")}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Boards
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-semibold text-gray-900">{board.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded-full">
            ● Live
          </span>
        </div>
      </nav>

      {/* Board */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-4 h-full items-start">
          {sortedColumns.map((column) => (
            <div
              key={column.id}
              className="flex-shrink-0 w-72 bg-gray-100 rounded-xl p-3"
            >
              <h3 className="font-semibold text-gray-700 text-sm mb-3 px-1">
                {column.title}
                <span className="ml-2 text-gray-400 font-normal">
                  {column.cards.length}
                </span>
              </h3>

              <div className="space-y-2 mb-3">
                {[...column.cards]
                  .sort((a, b) => a.order - b.order)
                  .map((card) => (
                    <div
                      key={card.id}
                      className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 group"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <p className="text-sm font-medium text-gray-900">{card.title}</p>
                        <button
                          onClick={() => deleteCard(card.id, column.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-xs flex-shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                      {card.description && (
                        <p className="text-xs text-gray-400 mt-1">{card.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {card.assignee && (
                          <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                            {card.assignee.name}
                          </span>
                        )}
                        {card.dueDate && (
                          <span className="text-xs text-gray-400">
                            {new Date(card.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {addingCard === column.id ? (
                <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200">
                  <input
                    autoFocus
                    type="text"
                    value={newCardTitle[column.id] || ""}
                    onChange={(e) =>
                      setNewCardTitle((prev) => ({ ...prev, [column.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createCard(column.id);
                      if (e.key === "Escape") setAddingCard(null);
                    }}
                    placeholder="Card title..."
                    className="w-full text-sm outline-none placeholder:text-gray-400"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => createCard(column.id)}
                      className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setAddingCard(null)}
                      className="text-gray-400 text-xs px-2 py-1 hover:text-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setAddingCard(column.id)}
                  className="w-full text-left text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-200 px-2 py-1.5 rounded-lg transition-colors"
                >
                  + Add card
                </button>
              )}
            </div>
          ))}

          {/* Add column */}
          {addingColumn ? (
            <div className="flex-shrink-0 w-72 bg-gray-100 rounded-xl p-3">
              <form onSubmit={createColumn}>
                <input
                  autoFocus
                  type="text"
                  value={newColumnTitle}
                  onChange={(e) => setNewColumnTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && setAddingColumn(false)}
                  placeholder="Column title..."
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Add column
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingColumn(false)}
                    className="text-gray-400 text-xs px-2 py-1.5 hover:text-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <button
              onClick={() => setAddingColumn(true)}
              className="flex-shrink-0 w-72 bg-gray-100 hover:bg-gray-200 rounded-xl p-3 text-sm text-gray-400 hover:text-gray-600 text-left transition-colors"
            >
              + Add column
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
