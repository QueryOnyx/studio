import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const signupSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  password: z.string().min(6),
});

const SALT_ROUNDS = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.errors }, { status: 400 });
    }

    const { username, email, password } = validation.data;

    const db = await getDb();
    const usersCollection = db.collection('users');

    // Check if user already exists (by username or email)
    const existingUser = await usersCollection.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      const message = existingUser.username === username
        ? 'Username already taken'
        : 'Email already in use';
      return NextResponse.json({ message }, { status: 409 }); // 409 Conflict
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert the new user
    const result = await usersCollection.insertOne({
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      // Add other default fields if needed (e.g., gamesPlayed: 0, winRate: 0)
       gamesPlayed: 0,
       winRate: 0,
       joinDate: new Date().toISOString(), // Store as ISO string or Date object
    });

    if (result.insertedId) {
      return NextResponse.json({ message: 'Signup successful' }, { status: 201 });
    } else {
      throw new Error('Failed to insert user');
    }
  } catch (error) {
    console.error('Signup Error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
