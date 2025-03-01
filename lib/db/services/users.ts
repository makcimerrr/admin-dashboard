import { db } from '../config';
import { users } from '../schema';
import { eq } from 'drizzle-orm';
// @ts-ignore
import { hash, compare } from 'bcryptjs';

/**
 * Creates a new user in the database.
 * @param user - The user object to create with name, email, and password.
 */
export async function createUserInDb(user: {
    name: string;
    email: string;
    password: string;
}) {
    try {
        // Vérifier si l'utilisateur existe déjà dans la base de données
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, user.email))
            .limit(1);

        if (existingUser.length > 0) {
            return 'User already exists';
        }

        // Hachage du mot de passe
        const passwordHash = await hash(user.password, 10);

        // Insérer l'utilisateur dans la base de données
        const result = await db
            .insert(users)
            .values({ name: user.name, email: user.email, password: passwordHash })
            .execute();

        return { name: user.name, email: user.email };
    } catch (error) {
        console.error('Error creating user in database:', error);
        throw new Error('Unable to create user in database.');
    }
}

/**
 * Retrieves a user from the database by email and password hash.
 * @param email - The email of the user.
 * @param password - The password of the user.
 * @returns The user object if found and password is correct, or null if not found or password is incorrect.
 */
export async function getUserFromDb(email: string, password: string) {
    try {
        // Recherche de l'utilisateur dans la base de données avec l'email.
        const user = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                password: users.password,
                role: users.role
            })
            .from(users)
            .where(eq(users.email, email))
            .limit(1)
            .execute();

        // Si l'utilisateur existe, comparez les mots de passe
        if (user.length > 0) {
            const userRecord = user[0];

            // Vérification du mot de passe avec bcrypt
            const isPasswordValid = await compare(password, userRecord.password!);

            if (isPasswordValid) {
                return {
                    id: userRecord.id,
                    name: userRecord.name,
                    email: userRecord.email,
                    role: userRecord.role
                };
            }
        }

        return null;
    } catch (error) {
        console.error('Error fetching user from database:', error);
        throw new Error('Unable to fetch user from database.');
    }
}

/**
 * Saves an OAuth user to the database.
 * @param email - The email of the user.
 * @param name - The name of the user.
 */
export async function saveOauthUser(email: string, name: string) {
    try {
        // Vérifier si l'utilisateur existe déjà dans la base de données
        const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        if (existingUser.length > 0) {
            return 'User already exists';
        }

        // Insérer l'utilisateur dans la base de données
        await db.insert(users).values({ email, name }).execute();

        return 'User added successfully';
    } catch (error) {
        console.error('Error saving OAuth user:', error);
        throw new Error('Unable to save OAuth user.');
    }
}

/**
 * Retrieves the role of a user by their email.
 * @param email - The email of the user.
 * @returns The role of the user if found, or null if not found.
 */
export async function getUserRole(email: string): Promise<string | null> {
    try {
        // Recherche de l'utilisateur dans la base de données avec l'email.
        const user = await db
            .select({ role: users.role })
            .from(users)
            .where(eq(users.email, email))
            .limit(1)
            .execute();

        // Si l'utilisateur existe, retourner le rôle
        if (user.length > 0) {
            return user[0].role;
        }

        return null;
    } catch (error) {
        console.error('Error fetching user role from database:', error);
        throw new Error('Unable to fetch user role from database.');
    }
}