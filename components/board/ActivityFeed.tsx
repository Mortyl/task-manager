"use client";

import { useEffect, useState } from "react";

interface Activity {
  id: string;
  action: string;
  cardTitle?: string;
  fromColumn?: string;
  toColumn?: string;
  createdAt: string;
  user: { id: string; name: string };
}

interface ActivityFeedProps {
  boardId: string;
  token: string;
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getActivityText(activity: Activity) {
  switch (activity.action) {
    case "card:created":
      return (
        <>
          added <span className="font-medium text-gray-900">"{activity.cardTitle}"</span>
          {activity.toColumn && <> to <span className="font-medium text-gray-900">{activity.toColumn}</span></>}
        </>
      );
    case "card:moved":
      return (
        <>
          moved <span className="font-medium text-gray-900">"{activity.cardTitle}"</span>
          {activity.fromColumn && activity.toColumn && (
            <> from <span className="font-medium text-gray-900">{activity.fromColumn}</span> to <span className="font-medium text-gray-900">{activity.toColumn}</span></>
          )}
        </>
      );
    case "card:deleted":
      return (
        <>
          deleted <span className="font-medium text-gray-900">"{activity.cardTitle}"</span>
        </>
      );
    case "card:updated":
      return (
        <>
          updated <span className="font-medium text-gray-900">"{activity.cardTitle}"</span>
        </>
      );
    case "column:created":
      return (
        <>
          added column <span className="font-medium text-gray-900">"{activity.toColumn}"</span>
        </>
      );
    case "column:deleted":
      return (
        <>
          deleted column <span className="font-medium text-gray-900">"{activity.fromColumn}"</span>
        </>
      );
    default:
      return <>{activity.action}</>;
  }
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function ActivityFeed({ boardId, token }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    fetchActivities();
    const interval = setInterval(fetchActivities, 10000);
    return () => clearInterval(interval);
  }, [boardId]);

  const fetchActivities = async () => {
    try {
      const res = await fetch(`/api/activity?boardId=${boardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex-shrink-0 bg-white border-l border-gray-200 flex flex-col transition-all duration-300 ${open ? "w-64" : "w-10"}`}>

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        {open && (
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Activity
          </h2>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="text-gray-400 hover:text-gray-600 transition-colors ml-auto"
          title={open ? "Collapse" : "Expand activity"}
        >
          {open ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          )}
        </button>
      </div>

      {/* Feed */}
      {open && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {loading ? (
            <div className="flex justify-center pt-4">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-xs text-gray-400 text-center pt-4">No activity yet</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex gap-2.5">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[10px] font-semibold">
                  {getInitials(activity.user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    <span className="font-medium text-gray-900">{activity.user.name}</span>{" "}
                    {getActivityText(activity)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(activity.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
