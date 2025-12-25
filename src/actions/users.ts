import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { ProfileRepository } from "../lib/server/profile/repository";
import { ConflictError, NotFoundError } from "../lib/server/shared/errors";
import { getCurrentUser } from "./orgs";

export const usersActions = {
	updateProfile: defineAction({
		accept: "form",
		input: z.object({
			username: z
				.string()
				.min(4, "Username must be longer than 3 characters")
				.max(50)
				.regex(
					/^[a-zA-Z-]+$/,
					"Username can only contain alphabets and hyphens",
				)
				.optional(),
			email: z.string().email("Invalid email address").optional(),
		}),
		handler: async ({ username, email }, context) => {
			const userId = await getCurrentUser(context);

			const repository = new ProfileRepository();

			try {
				const updatedUser = await repository.updateUser(
					userId,
					{
						username: username || undefined,
						email: email || undefined,
					}
				);

				return {
					success: true,
					user: updatedUser,
				};
			} catch (error) {
				console.error("Profile update error:", error);

				if (error instanceof ConflictError) {
					throw new ActionError({
						code: "CONFLICT",
						message: error.message,
					});
				}

				if (error instanceof NotFoundError) {
					throw new ActionError({
						code: "NOT_FOUND",
						message: error.message,
					});
				}

				throw new ActionError({
					code: "INTERNAL_SERVER_ERROR",
					message: "An unexpected error occurred while updating your profile.",
				});
			}
		},
	}),
	me: defineAction({
		handler: async (_, context) => {
			return context.locals.currentUser || null;
		},
	}),
};
