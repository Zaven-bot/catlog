import { Request, Response } from 'express';
import { getRecommendations } from '../services/recommendations';

export const fetchRecommendations = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id; // Assuming user ID is available in the request
        const recommendations = await getRecommendations(userId);
        res.status(200).json(recommendations);
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};