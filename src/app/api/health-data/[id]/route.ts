import {NextRequest, NextResponse} from "next/server";

// 1. Import the database instance from your local lib
import prisma from "@/lib/prisma"; 
// 2. Import the types directly from the Prisma package
import { Prisma } from "@prisma/client"; 
import {HealthData} from "@/app/api/health-data/route";

export interface HealthDataPatchRequest {
    data?: Prisma.InputJsonValue
}

export interface HealthDataGetResponse {
    healthData: HealthData
}

export async function GET(
    req: NextRequest,
    {params}: { params: Promise<{ id: string }> }
) {
    const {id} = await params
    const healthData = await prisma.healthData.findUniqueOrThrow({where: {id}})
    return NextResponse.json({healthData})
}

export async function PATCH(
    req: NextRequest,
    {params}: { params: Promise<{ id: string }> }
) {
    const {id} = await params
    const body: HealthDataPatchRequest = await req.json()

    const healthData = await prisma.healthData.update({
        where: {id},
        data: body
    })
    return NextResponse.json({healthData})
}

export async function DELETE(
    req: NextRequest,
    {params}: { params: Promise<{ id: string }> }
) {
    const {id} = await params
    await prisma.healthData.delete({where: {id}})
    return NextResponse.json({})
}
