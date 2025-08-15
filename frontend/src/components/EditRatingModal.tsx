import React, { useState } from 'react';
import { UserAnime } from '../../../shared/types';

interface EditRatingModalProps {
    anime: any;
    userAnime: UserAnime | null;
    onClose: () => void;
    onSave: (rating: number, notes: string) => void;
}

const EditRatingModal: React.FC<EditRatingModalProps> = ({ anime, userAnime, onClose, onSave }) => {
    const [rating, setRating] = useState(userAnime?.personalRating?.toString() || '');
    const [notes, setNotes] = useState(userAnime?.notes || '');

    const handleSave = () => {
        onSave(parseFloat(rating) || 0, notes);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96">
                <h2 className="text-xl font-semibold mb-4">Edit Rating & Notes</h2>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Rating (1-10)</label>
                    <input
                        type="number"
                        value={rating}
                        onChange={(e) => setRating(e.target.value)}
                        className="w-full p-2 border rounded"
                        min="1"
                        max="10"
                    />
                </div>
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Notes</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full p-2 border rounded"
                    />
                </div>
                <div className="flex justify-end space-x-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded">
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditRatingModal;