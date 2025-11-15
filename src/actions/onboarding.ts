'use server';

import {PersonalInfoData} from "@/components/onboarding/PersonalInfo";
import prisma from "@/lib/prisma";
import {auth} from "@/auth";

interface OnboardingSubmitRequest {
    symptoms: string;
    personalInfo: PersonalInfoData;
}

export async function onboardingSubmit(data: OnboardingSubmitRequest) {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) throw new Error('User not found');

    return prisma.$transaction(async (prisma) => {
        const user = await prisma.user.findUniqueOrThrow({where: {id: userId}});

        // Save personal info
        const personalInfoRecord = await prisma.healthData.findFirst({
            where: {authorId: userId, type: 'PERSONAL_INFO'}
        });
        const personalInfoData = {
            name: '',
            height: {unit: data.personalInfo.heightUnit, value: data.personalInfo.height},
            weight: {unit: data.personalInfo.weightUnit, value: data.personalInfo.weight},
            birthDate: data.personalInfo.birthDate,
            gender: data.personalInfo.gender,
            ethnicity: data.personalInfo.ethnicity,
            country: data.personalInfo.country,
        };
        if (!personalInfoRecord) {
            await prisma.healthData.create({
                data: {
                    type: 'PERSONAL_INFO',
                    authorId: userId,
                    data: personalInfoData,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                }
            });
        } else {
            await prisma.healthData.update({where: {id: personalInfoRecord.id}, data: {data: personalInfoData}});
        }

        // Save symptoms
        await prisma.healthData.create({
            data: {
                type: 'SYMPTOMS',
                authorId: userId,
                data: {description: data.symptoms}
            }
        });

        // Update onboarding status
        await prisma.user.update({where: {id: userId}, data: {hasOnboarded: true}});

        // Find or create Google LLM provider for user
        let llmProvider = await prisma.lLMProvider.findFirst({
            where: {authorId: userId, providerId: 'google'}
        });

        if (!llmProvider) {
            llmProvider = await prisma.lLMProvider.create({
                data: {
                    providerId: 'google',
                    name: 'Google',
                    apiKey: process.env.GOOGLE_API_KEY || '',
                    apiURL: 'https://generativelanguage.googleapis.com/v1beta',
                    authorId: userId,
                    order: 1,
                }
            });
        }

        // Fetch assistant modes
        const assistantModes = await prisma.assistantMode.findMany({
            where: {
                OR: [
                    {authorId: userId, visibility: 'PRIVATE'},
                    {visibility: 'PUBLIC'},
                ],
                name: {in: ['Root Cause Analysis & Long Term Health.', 'Family Medicine', 'Best Doctor']}
            }
        });

        // Create chat rooms
        return prisma.chatRoom.createManyAndReturn({
            data: assistantModes.map(mode => ({
                name: 'New Chat',
                authorId: userId,
                assistantModeId: mode.id,
                llmProviderId: llmProvider.id,
                llmProviderModelId: 'gemini-2.5-pro'
            }))
        });
    });
}
