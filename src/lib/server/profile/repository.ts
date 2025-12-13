import { db, eq, Users } from "astro:db";
import { NotFoundError, ConflictError } from "../shared/errors";

export class ProfileRepository {
    async findById(id: string) {
        return await db.select().from(Users).where(eq(Users.id, id)).get();
    }

    async findByUsername(username: string) {
        return await db.select().from(Users).where(eq(Users.username, username)).get();
    }

    async findByEmail(email: string) {
        return await db.select().from(Users).where(eq(Users.email, email)).get();
    }

    async updateUser(
        userId: string,
        data: { username?: string; email?: string }
    ) {
        const user = await this.findById(userId);
        if (!user) throw new NotFoundError("User");

        if (data.username && data.username !== user.username) {
            const existingUser = await this.findByUsername(data.username);
            if (existingUser) {
                throw new ConflictError("Username is already taken");
            }
        }

        if (data.email && data.email !== user.email) {
            const existingUser = await this.findByEmail(data.email);
            if (existingUser) {
                throw new ConflictError("Email is already associated with another account");
            }
        }

        await db
            .update(Users)
            .set(data)
            .where(eq(Users.id, userId));

        return await this.findById(userId);
    }
}
