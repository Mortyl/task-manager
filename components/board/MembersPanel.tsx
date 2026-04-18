"use client";

import { useEffect, useState } from "react";

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface MembersPanelProps {
  boardId: string;
  token: string;
  ownerId: string;
  currentUserId: string;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function MembersPanel({
  boardId,
  token,
  ownerId,
  currentUserId,
}: MembersPanelProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [boardId]);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/invite?boardId=${boardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setInviting(true);

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ boardId, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setSuccess(data.message);
      setEmail("");
      setShowForm(false);
      fetchMembers();
    } catch (err) {
      setError("Something went wrong.");
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!confirm("Remove this member from the board?")) return;
    try {
      await fetch(`/api/invite?boardId=${boardId}&userId=${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setMembers((prev) => prev.filter((m) => m.user.id !== userId));
    } catch (err) {
      console.error(err);
    }
  };

  const isOwner = currentUserId === ownerId;

  return (
    <div className="border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Members
        </h3>
        {isOwner && (
          <button
            onClick={() => {
              setShowForm(!showForm);
              setError("");
              setSuccess("");
            }}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {showForm ? "Cancel" : "+ Invite"}
          </button>
        )}
      </div>

      {/* Invite form */}
      {showForm && (
        <form onSubmit={invite} className="mb-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Email address"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
          />
          {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
          <button
            type="submit"
            disabled={inviting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {inviting ? "Inviting..." : "Add member"}
          </button>
        </form>
      )}

      {success && (
        <p className="text-xs text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mb-3">
          {success}
        </p>
      )}

      {/* Members list */}
      {loading ? (
        <div className="flex justify-center py-2">
          <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {/* Owner */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[9px] font-semibold">
                {getInitials("Owner")}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-900">You (owner)</p>
              </div>
            </div>
            <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              Owner
            </span>
          </div>

          {/* Members */}
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-[9px] font-semibold">
                  {getInitials(member.user.name)}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-900">{member.user.name}</p>
                  <p className="text-[10px] text-gray-400">{member.user.email}</p>
                </div>
              </div>
              {isOwner && (
                <button
                  onClick={() => removeMember(member.user.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>
          ))}

          {members.length === 0 && (
            <p className="text-xs text-gray-400">No other members yet</p>
          )}
        </div>
      )}
    </div>
  );
}
