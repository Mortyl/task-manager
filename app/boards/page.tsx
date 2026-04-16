"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface Board {
  id: string;
  title: string;
  description?: string;
  owner: { name: string };
  _count: { columns: number };
  createdAt: string;
}

export default function BoardsPage() {
  const { user, token, logout, loading } = useAuth();
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [fetching, setFetching] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (token) fetchBoards();
  }, [token]);

  const fetchBoards = async () => {
    try {
      const res = await fetch("/api/boards", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBoards(data);
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  };

  const createBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBoards((prev) => [data, ...prev]);
      setTitle("");
      setDescription("");
      setShowForm(false);
      router.push(`/boards/${data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading || fetching) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-indigo-600">TaskFlow</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Hello, {user?.name}</span>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900">My Boards</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New Board
          </button>
        </div>

        {/* Create board form */}
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Create a new board</h3>
            <form onSubmit={createBoard} className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Board title"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Board"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-sm text-gray-500 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Boards grid */}
        {boards.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium mb-2">No boards yet</p>
            <p className="text-sm">Create your first board to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => router.push(`/boards/${board.id}`)}
                className="text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <h3 className="font-semibold text-gray-900 mb-1">{board.title}</h3>
                {board.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{board.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{board._count.columns} columns</span>
                  <span>·</span>
                  <span>by {board.owner.name}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
