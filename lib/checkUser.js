import { currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const checkUser = async () => {
    const user = await currentUser();

    if (!user) {
        return null;
    }

    try {
        const email = user.emailAddresses[0].emailAddress;

        // Step 1: Check if user exists by `clerkUserId`
        let loggedInUser = await db.user.findUnique({
            where: {
                clerkUserId: user.id,
            },
            include: {
                transactions: {
                    where: {
                        type: "CREDIT_PURCHASE",
                        createdAt: {
                            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                        },
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                    take: 1,
                },
            },
        });

        // Step 2: If not found by clerkUserId, check by email
        if (!loggedInUser) {
            loggedInUser = await db.user.findUnique({
                where: {
                    email,
                },
            });
        }

        // Step 3: If still not found, create new user
        if (!loggedInUser) {
            const name = `${user.firstName} ${user.lastName}`;
            const newUser = await db.user.create({
                data: {
                    clerkUserId: user.id,
                    name,
                    imageUrl: user.imageUrl,
                    email,
                    transactions: {
                        create: {
                            type: "CREDIT_PURCHASE",
                            packageId: "free_user",
                            amount: 0,
                        },
                    },
                },
            });

            return newUser;
        }

        return loggedInUser;
    } catch (error) {
        console.error("User creation error:", error);
        return null;
    }
};
