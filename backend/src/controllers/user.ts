import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        username: string;
        email: string;
    };
}

export const getUserProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
};

export const updateUserProfile = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        
        const userId = req.user.id;
        const { username, email } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { username, email },
        });

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
};