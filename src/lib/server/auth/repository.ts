import { db, Users, Orgs, eq } from "astro:db";
import { withId } from "../../../../db/utils";
import type { User, CreateUserData } from "../shared/types";
import { NotFoundError, ConflictError } from "../shared/errors";

export class AuthRepository {
    async findById(id: string): Promise<User | null> {
        try {
            const user = await db.select().from(Users).where(eq(Users.id, id)).get();
            return user as unknown as User;
        } catch (error) {
            console.error('Database error in findById:', error);
            return null;
        }
    }

    async findByEmail(email: string): Promise<User | null> {
        try {
            const user = await db.select().from(Users).where(eq(Users.email, email)).get();
            return user as unknown as User;
        } catch (error) {
            console.error('Database error in findByEmail:', error);
            return null;
        }
    }

    async findByGithubName(githubName: string): Promise<User | null> {
        try {
            const user = await db.select().from(Users).where(eq(Users.githubName, githubName)).get();
            return user as unknown as User;
        } catch (error) {
            console.error('Database error in findByGithubName:', error);
            return null;
        }
    }

    async findByGoogleId(googleId: string): Promise<User | null> {
        try {
            const user = await db.select().from(Users).where(eq(Users.googleId, googleId)).get();
            return user as unknown as User;
        } catch (error) {
            console.error('Database error in findByGoogleId:', error);
            return null;
        }
    }

    async findOrCreateUser(userData: CreateUserData): Promise<[User, boolean]> {
        if (userData.email) {
            const existingByEmail = await this.findByEmail(userData.email);
            if (existingByEmail) {
                return [existingByEmail, true];
            }
        }

        if (userData.provider === 'google' && userData.googleId) {
            const existingByGoogle = await this.findByGoogleId(userData.googleId);
            if (existingByGoogle) return [existingByGoogle, true];
        }

        return [await this.createUser(userData), false];
    }

    private async createUser(userData: CreateUserData): Promise<User> {
        try {
            const values = withId({
                provider: userData.provider,
                pfp: userData.pfp,
                githubName: userData.provider === 'github' ? userData.githubName : null,
                googleId: userData.provider === 'google' ? userData.googleId : null,
                isGithubEnabled: userData.isGithubEnabled,
                username: userData.username,
                email: userData.email || null,
            });

            await db.insert(Users).values(values);

            const newUser = await this.findById(values.id);
            if (!newUser) {
                throw new Error('Failed to create user');
            }

            return newUser;
        } catch (error) {
            console.error('Database error in createUser:', error);
            throw new ConflictError('Failed to create user account');
        }
    }

    async updateUser(id: string, updates: Partial<User>): Promise<User> {
        try {
            await db.update(Users).set(updates).where(eq(Users.id, id));
            const updatedUser = await this.findById(id);

            if (!updatedUser) {
                throw new NotFoundError('User');
            }

            return updatedUser;
        } catch (error) {
            console.error('Database error in updateUser:', error);
            throw error;
        }
    }

    async deleteUser(id: string): Promise<void> {
        try {
            await db.delete(Users).where(eq(Users.id, id));
        } catch (error) {
            console.error('Database error in deleteUser:', error);
            throw error;
        }
    }
}
