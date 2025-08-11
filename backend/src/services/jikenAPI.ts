import axios from 'axios';

const JIKAN_API_BASE_URL = 'https://api.jikan.moe/v4';

export const fetchAnimeById = async (id) => {
    try {
        const response = await axios.get(`${JIKAN_API_BASE_URL}/anime/${id}`);
        return response.data;
    } catch (error) {
        throw new Error('Error fetching anime by ID: ' + error.message);
    }
};

export const searchAnime = async (query) => {
    try {
        const response = await axios.get(`${JIKAN_API_BASE_URL}/anime`, {
            params: { q: query },
        });
        return response.data;
    } catch (error) {
        throw new Error('Error searching anime: ' + error.message);
    }
};

export const fetchTopAnime = async () => {
    try {
        const response = await axios.get(`${JIKAN_API_BASE_URL}/top/anime`);
        return response.data;
    } catch (error) {
        throw new Error('Error fetching top anime: ' + error.message);
    }
};