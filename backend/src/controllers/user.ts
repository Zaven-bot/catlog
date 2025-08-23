import { Request, Response } from 'express';
import { prisma } from '../../config/database';

export const getUserProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id; // Using optional chaining
        
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
};

export const updateUserProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id; // Using optional chaining
        
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        
        const { username, email } = req.body; // Changed from 'name' to 'username' to match schema

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { username, email },
            select: {
                id: true,
                username: true,
                email: true,
                updatedAt: true
            }
        });

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
};