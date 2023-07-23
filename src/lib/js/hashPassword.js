import { hash } from 'argon2'
export async function hashPassword(password, salt) {
  try {
    const hashedPassword = await hash(password, salt); // Hash the password with the salt and pepper
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password:', error);
  }
}

