import { z } from 'zod';

// Define a schema for validating anime entries
export const animeEntrySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  episodes: z.number().min(0, 'Episodes must be a non-negative number'),
  status: z.enum(['Watching', 'Completed', 'Dropped', 'Plan to Watch']),
  rating: z.number().min(0).max(10).optional(),
  notes: z.string().optional(),
});

// Define a schema for validating user login
export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

// Define a schema for validating user registration
export const registrationSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  email: z.string().email('Invalid email address'),
});

// Function to validate anime entry
export const validateAnimeEntry = (data) => {
  return animeEntrySchema.parse(data);
};

// Function to validate login data
export const validateLogin = (data) => {
  return loginSchema.parse(data);
};

// Function to validate registration data
export const validateRegistration = (data) => {
  return registrationSchema.parse(data);
};