import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get("boardId");

    if (!boardId) return NextResponse.json({ error: "Board ID required." }, { status: 400 });

    const activities = await prisma.activity.findMany({
      where: { boardId },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error("Get activity error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const { boardId, action, cardTitle, fromColumn, toColumn } = await req.json();

    if (!boardId || !action) {
      return NextResponse.json({ error: "Board ID and action required." }, { status: 400 });
    }

    const activity = await prisma.activity.create({
      data: {
        boardId,
        userId: payload.userId,
        action,
        cardTitle,
        fromColumn,
        toColumn,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Create activity error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
