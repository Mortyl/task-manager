import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { ownerId: payload.userId },
          { members: { some: { userId: payload.userId } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { columns: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(boards);
  } catch (error) {
    console.error("Get boards error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const { title, description } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const board = await prisma.board.create({
      data: {
        title,
        description,
        ownerId: payload.userId,
        columns: {
          create: [
            { title: "To Do", order: 0 },
            { title: "In Progress", order: 1 },
            { title: "Done", order: 2 },
          ],
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        columns: { include: { cards: true }, orderBy: { order: "asc" } },
        members: true,
      },
    });

    return NextResponse.json(board);
  } catch (error) {
    console.error("Create board error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
