"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { io, Socket } from "socket.io-client";
import { useDroppable } from "@dnd-kit/core";
import CardModal from "@/components/board/CardModal";
import ActivityFeed from "@/components/board/ActivityFeed";
import MembersPanel from "@/components/board/MembersPanel";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

function getCardColor(columnTitle: string) {
  const title = columnTitle.toLowerCase().trim();
  if (title.includes("to do") || title.includes("todo"))
    return "bg-red-50 border-red-100";
  if (title.includes("progress"))
    return "bg-yellow-50 border-yellow-100";
  if (title.includes("done") || title.includes("complete"))
    return "bg-green-50 border-green-100";
  return "bg-white border-gray-200";
}

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
      <div ref={setNodeRef} className="space-y-2 mb-3 min-h-[60px]">
        {children}
      </div>
  );
}

function SortableCard({
                        card,
                        onDelete,
                        columnTitle,
                        onClick
                      }: {
  card: Card;
  onDelete: (cardId: string, columnId: string) => void;
  columnTitle: string;
  onClick: (card: Card) => void;

}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id, data: { type: "card", card } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
      <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          className={`rounded-lg p-3 shadow-sm border group cursor-grab active:cursor-grabbing select-none ${getCardColor(columnTitle)}`}
      >
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-start gap-2 flex-1">
          <p
              className="text-sm font-medium text-gray-900 flex-1 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onClick(card);
              }}
          >
            {card.title}
          </p>
        </div>
        <button
          onClick={() => onDelete(card.id, card.columnId)}
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
  );
}

function CardOverlay({ card }: { card: Card }) {
  return (
    <div className="bg-white rounded-lg p-3 shadow-lg border border-indigo-300 rotate-2 w-72">
      <p className="text-sm font-medium text-gray-900" >{card.title}</p>
      {card.description && (
        <p className="text-xs text-gray-400 mt-1">{card.description}</p>
      )}
    </div>
  );
}

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, token, loading } = useAuth();
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);

  const [boardId, setBoardId] = useState<string>("");
  const [board, setBoard] = useState<Board | null>(null);
  const [fetching, setFetching] = useState(true);
  const [newCardTitle, setNewCardTitle] = useState<Record<string, string>>({});
  const [addingCard, setAddingCard] = useState<string | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [addingColumn, setAddingColumn] = useState(false);
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedColumnTitle, setSelectedColumnTitle] = useState("");
  const [dragFromColumn, setDragFromColumn] = useState<string>("");
  const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    params.then(({ id }) => setBoardId(id));
  }, [params]);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (token && boardId) fetchBoard();
  }, [token, boardId]);

  useEffect(() => {
    if (!board || !token) return;

    const socket = io({ path: "/api/socket" });
    socketRef.current = socket;
    socket.emit("join-board", board.id);

    socket.on("card:created", (card: Card) => {
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

    socket.on("card:moved", (data: { cardId: string; fromColumnId: string; toColumnId: string; newOrder: number }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        let movedCard: Card | undefined;
        const columns = prev.columns.map((col) => {
          if (col.id === data.fromColumnId) {
            movedCard = col.cards.find((c) => c.id === data.cardId);
            return { ...col, cards: col.cards.filter((c) => c.id !== data.cardId) };
          }
          return col;
        });
        if (!movedCard) return prev;
        return {
          ...prev,
          columns: columns.map((col) => {
            if (col.id === data.toColumnId) {
              const updated = { ...movedCard!, columnId: data.toColumnId, order: data.newOrder };
              return { ...col, cards: [...col.cards, updated] };
            }
            return col;
          }),
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

    return () => { socket.disconnect(); };
  }, [board?.id, token]);

  const fetchBoard = async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}`, {
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

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active.data.current?.type === "card") {
      setActiveCard(active.data.current.card);
      const fromCol = board?.columns.find((col) =>
          col.cards.some((c) => c.id === active.id)
      );
      setDragFromColumn(fromCol?.title ?? "");
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !board) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumn = board.columns.find((col) =>
      col.cards.some((c) => c.id === activeId)
    );
    const overColumn =
      board.columns.find((col) => col.id === overId) ||
      board.columns.find((col) => col.cards.some((c) => c.id === overId));

    if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) return;

    setBoard((prev) => {
      if (!prev) return prev;
      const activeCard = activeColumn.cards.find((c) => c.id === activeId);
      if (!activeCard) return prev;

      return {
        ...prev,
        columns: prev.columns.map((col) => {
          if (col.id === activeColumn.id) {
            return { ...col, cards: col.cards.filter((c) => c.id !== activeId) };
          }
          if (col.id === overColumn.id) {
            return {
              ...col,
              cards: [...col.cards, { ...activeCard, columnId: overColumn.id }],
            };
          }
          return col;
        }),
      };
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || !board) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeColumn = board.columns.find((col) =>
      col.cards.some((c) => c.id === activeId)
    );
    if (!activeColumn) return;

    const newOrder = activeColumn.cards.findIndex((c) => c.id === activeId);

    try {
      const res = await fetch("/api/cards", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: activeId,
          columnId: activeColumn.id,
          order: newOrder,
        }),
      });

      if (res.ok) {
        const movedCard = activeColumn.cards.find((c) => c.id === activeId);
        await logActivity("card:moved", {
          cardTitle: movedCard?.title,
          fromColumn: dragFromColumn,
          toColumn: activeColumn.title,
        });

        socketRef.current?.emit("card:moved", {
          cardId: activeId,
          fromColumnId: activeColumn.id,
          toColumnId: activeColumn.id,
          newOrder,
          boardId: board.id,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const logActivity = async (action: string, data: {
    cardTitle?: string;
    fromColumn?: string;
    toColumn?: string;
  }) => {
    await fetch("/api/activity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ boardId: board?.id, action, ...data }),
    });
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

      const col = board?.columns.find((c) => c.id === columnId);
      await logActivity("card:created", { cardTitle: title, toColumn: col?.title });
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
      const cardToDelete = board?.columns.flatMap(c => c.cards).find(c => c.id === cardId);

      await fetch(`/api/cards?id=${cardId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      await logActivity("card:deleted", { cardTitle: cardToDelete?.title });

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

      await logActivity("column:created", { toColumn: newColumnTitle });

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

  const sortedColumns = [...(board.columns ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
        <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded-full">
          ● Live
        </span>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 h-full items-start">
            {sortedColumns.map((column) => (
                <div key={column.id} className="flex-shrink-0 w-72 bg-gray-100 rounded-xl p-3 group">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-gray-700 text-sm">
                    {column.title}
                    <span className="ml-2 text-gray-400 font-normal">{column.cards.length}</span>
                  </h3>
                  {!["To Do", "In Progress", "Done"].includes(column.title) && (
                      <button
                          onClick={async () => {
                            if (!confirm(`Delete "${column.title}" and all its cards?`)) return;
                            await fetch(`/api/columns?id=${column.id}`, {
                              method: "DELETE",
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            setBoard((prev) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                columns: prev.columns.filter((c) => c.id !== column.id),
                              };
                            });
                          }}
                          className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6"/>
                          <path d="M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                  )}
                </div>

                <SortableContext
                    items={column.cards.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                >
                  <DroppableColumn id={column.id}>
                    {[...column.cards]
                        .sort((a, b) => a.order - b.order)
                        .map((card) => (
                            <SortableCard
                                key={card.id}
                                card={card}
                                onDelete={deleteCard}
                                columnTitle={column.title}
                                onClick={(card) => {
                                  setSelectedCard(card);
                                  setSelectedColumnTitle(column.title);
                                }}
                            />
                        ))}
                  </DroppableColumn>
                </SortableContext>

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
                      className="w-full text-sm text-gray-900 outline-none placeholder:text-gray-400"
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
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
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

          <DragOverlay>
            {activeCard ? <CardOverlay card={activeCard} /> : null}
          </DragOverlay>
        </DndContext>
        </div>
        <div className="flex-shrink-0 w-64 bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
          <MembersPanel
              boardId={boardId}
              token={token!}
              ownerId={board.owner.id}
              currentUserId={user?.id ?? ""}
          />
          <ActivityFeed boardId={boardId} token={token!} />
        </div>
      </div>

      {selectedCard && (
          <CardModal
              card={selectedCard}
              columnTitle={selectedColumnTitle}
              token={token!}
              onClose={() => setSelectedCard(null)}
              onUpdate={(updated) => {
                setBoard((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    columns: prev.columns.map((col) => ({
                      ...col,
                      cards: col.cards.map((c) =>
                          c.id === updated.id ? { ...c, ...updated } : c
                      ),
                    })),
                  };
                });
                setSelectedCard(null);
              }}
              onDelete={deleteCard}
          />
      )}
    </div>
  );
}

