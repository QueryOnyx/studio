import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { z } from 'zod';
import { ObjectId } from 'mongodb'; // Import ObjectId if filtering by _id

// Define schemas for validation
const updateUserSchema = z.object({
  // Allow updating username and email, add other fields as needed
  username: z.string().min(3).max(20).optional(),
  email: z.string().email().optional(),
  // Add other updatable fields here, e.g., avatarUrl: z.string().url().optional()
}).strict(); // Use strict to prevent extra fields

// GET request handler to fetch user data
export async function GET(req: NextRequest, { params }: { params: { username: string } }) {
  try {
    const username = params.username;

    if (!username) {
      return NextResponse.json({ message: 'Username parameter is required' }, { status: 400 });
    }

    const db = await getDb();
    const usersCollection = db.collection('users');

    // Find user by username, exclude password field
    const user = await usersCollection.findOne(
      { username },
      { projection: { password: 0 } } // Exclude password from the result
    );

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User found', user }, { status: 200 });

  } catch (error) {
    console.error('Get User Error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}


// PUT (or PATCH) request handler to update user data
export async function PUT(req: NextRequest, { params }: { params: { username: string } }) {
   try {
    const currentUsername = params.username; // The username used to find the user
    const body = await req.json();

    if (!currentUsername) {
      return NextResponse.json({ message: 'Username parameter is required' }, { status: 400 });
    }

    // Validate the request body
    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid update data', errors: validation.error.errors }, { status: 400 });
    }

    const updateData = validation.data;

    // Prevent updating with empty data
    if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ message: 'No update data provided' }, { status: 400 });
    }

    const db = await getDb();
    const usersCollection = db.collection('users');

    // Check if the target user exists
    const existingUser = await usersCollection.findOne({ username: currentUsername });
    if (!existingUser) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // If username or email is being updated, check for conflicts
    if (updateData.username && updateData.username !== currentUsername) {
        const conflictUser = await usersCollection.findOne({ username: updateData.username });
        if (conflictUser) {
            return NextResponse.json({ message: 'New username is already taken' }, { status: 409 });
        }
    }
     if (updateData.email && updateData.email !== existingUser.email) {
        const conflictUser = await usersCollection.findOne({ email: updateData.email });
        if (conflictUser) {
            return NextResponse.json({ message: 'New email is already in use' }, { status: 409 });
        }
    }


    // Perform the update
    const result = await usersCollection.updateOne(
      { username: currentUsername },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
       // Should not happen due to the check above, but good practice
      return NextResponse.json({ message: 'User not found during update' }, { status: 404 });
    }

     if (result.modifiedCount === 0 && result.matchedCount === 1) {
       // Data provided was the same as existing data
       // Return the existing user data (excluding password)
       const { password: _, ...userWithoutPassword } = existingUser;
       return NextResponse.json({ message: 'No changes detected', user: userWithoutPassword }, { status: 200 });
     }

    // Fetch the updated user data to return (excluding password)
     const updatedUser = await usersCollection.findOne(
         // Use the new username if it was updated, otherwise the original
         { username: updateData.username || currentUsername },
         { projection: { password: 0 } }
     );

    return NextResponse.json({ message: 'Profile updated successfully', user: updatedUser }, { status: 200 });

  } catch (error) {
    console.error('Update User Error:', error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
