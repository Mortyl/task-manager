import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTokenFromHeader, verifyToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const { boardId, email } = await req.json();

    if (!boardId || !email) {
      return NextResponse.json({ error: "Board ID and email are required." }, { status: 400 });
    }

    // Check the inviter owns or is a member of the board
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { members: true },
    });

    if (!board) return NextResponse.json({ error: "Board not found." }, { status: 404 });

    const isOwner = board.ownerId === payload.userId;
    const isMember = board.members.some((m) => m.userId === payload.userId);

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    // Find the user to invite
    const userToInvite = await prisma.user.findUnique({ where: { email } });

    if (!userToInvite) {
      return NextResponse.json({ error: "No user found with that email address." }, { status: 404 });
    }

    if (userToInvite.id === payload.userId) {
      return NextResponse.json({ error: "You can't invite yourself." }, { status: 400 });
    }

    // Check if already a member
    const alreadyMember = board.members.some((m) => m.userId === userToInvite.id) ||
      board.ownerId === userToInvite.id;

    if (alreadyMember) {
      return NextResponse.json({ error: "This user is already a member of the board." }, { status: 400 });
    }

    // Check for existing pending invite
    const existingInvite = await prisma.invite.findFirst({
      where: { boardId, email, status: "pending" },
    });

    if (existingInvite) {
      return NextResponse.json({ error: "This user has already been invited." }, { status: 400 });
    }

    // Add them directly as a member
    await prisma.boardMember.create({
      data: {
        boardId,
        userId: userToInvite.id,
        role: "member",
      },
    });

    // Log the invite
    await prisma.invite.create({
      data: {
        boardId,
        email,
        invitedById: payload.userId,
        status: "accepted",
      },
    });

    return NextResponse.json({
      success: true,
      message: `${userToInvite.name} has been added to the board.`,
      user: { id: userToInvite.id, name: userToInvite.name, email: userToInvite.email },
    });
  } catch (error) {
    console.error("Invite error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get("boardId");

    if (!boardId) return NextResponse.json({ error: "Board ID required." }, { status: 400 });

    const members = await prisma.boardMember.findMany({
      where: { boardId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Get members error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const token = getTokenFromHeader(req.headers.get("authorization"));
    if (!token) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get("boardId");
    const userId = searchParams.get("userId");

    if (!boardId || !userId) {
      return NextResponse.json({ error: "Board ID and user ID required." }, { status: 400 });
    }

    await prisma.boardMember.deleteMany({
      where: { boardId, userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove member error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
