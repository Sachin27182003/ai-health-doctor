import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import prisma, { Prisma } from "@/lib/prisma";
import assistantModeSeed from "../../../../../prisma/data/assistant-mode.json";
import llmProviderSeed from "../../../../../prisma/data/llm-provider.json";

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { message: "Username and password are required" },
                { status: 400 }
            );
        }

        // 🔍 Check if username exists
        const existingUser = await prisma.user.findUnique({
            where: { username },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: "Username already exists" },
                { status: 409 }
            );
        }

        // Hash password
        const hashedPassword = await hash(password, 10);

        // Transaction
        await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    username,
                    password: hashedPassword,
                    hasOnboarded: false,
                },
            });

            await tx.assistantMode.createMany({
                data: assistantModeSeed.map((mode) => ({
                    ...mode,
                    authorId: user.id,
                    visibility: "PRIVATE",
                })),
            });

            await tx.lLMProvider.createMany({
                data: llmProviderSeed.map((provider) => ({
                    ...provider,
                    authorId: user.id,
                })),
            });
        });

        return NextResponse.json({ message: "success" }, { status: 201 });

    } catch (error: unknown) {
    console.error(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
            return NextResponse.json(
                { message: "Username already exists" },
                { status: 409 }
            );
        }
    }

    return NextResponse.json(
        { message: "An error occurred" },
        { status: 500 }
    );
}

}
