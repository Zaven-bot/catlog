import { Request, Response } from 'express';
import { User } from '../../prisma/schema'; // Adjust the import based on your actual User model location
import { prisma } from '../../utils/jwt'; // Adjust the import based on your actual prisma client location

export const getUserProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id; // Assuming user ID is stored in the request after authentication
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

export const updateUserProfile = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id; // Assuming user ID is stored in the request after authentication
        const { name, email } = req.body;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { name, email },
        });

        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error });
    }
};