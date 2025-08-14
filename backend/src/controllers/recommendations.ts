import { Request, Response } from 'express';
import { getRecommendations } from '../services/recommendations';

interface AuthenticatedRequest extends Request {
    user?: {
        id: number;
        username: string;
        email: string;
    };
}

export const fetchRecommendations = async (req: AuthenticatedRequest, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }
        
        const userId = req.user.id.toString();
        const recommendations = await getRecommendations(userId);
        res.status(200).json(recommendations);
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};