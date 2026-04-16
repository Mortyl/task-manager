import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const board = await prisma.board.findUnique({
      where: { id: params.id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        columns: {
          orderBy: { order: "asc" },
          include: {
            cards: {
              orderBy: { order: "asc" },
              include: {
                creator: { select: { id: true, name: true } },
                assignee: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!board) {
      return NextResponse.json({ error: "Board not found." }, { status: 404 });
    }

    const isMember =
      board.ownerId === payload.userId ||
      board.members.some((m) => m.userId === payload.userId);

    if (!isMember) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error("Get board error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const { title, description } = await req.json();

    const board = await prisma.board.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json(board);
  } catch (error) {
    console.error("Update board error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const board = await prisma.board.findUnique({ where: { id: params.id } });

    if (!board || board.ownerId !== payload.userId) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    await prisma.board.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete board error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
