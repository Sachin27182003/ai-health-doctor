export const runtime = "nodejs";

import prisma from "@/lib/prisma";
import { compare } from "bcryptjs";

export async function POST(req: Request) {
  const { username, password } = await req.json();

  // Safety checks
  if (!username || !password) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, username: true, password: true },
  });

  if (!user) {
    return Response.json(null, { status: 401 });
  }

  const isValid = await compare(password, user.password);

  if (!isValid) {
    return Response.json(null, { status: 401 });
  }

  // Return EXACT user (this prevents mixing)
  return Response.json({
    id: user.id,
    username: user.username,
  });
}
