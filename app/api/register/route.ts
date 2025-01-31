import { NextResponse } from 'next/server';
import { createUserInDb } from '@/lib/db';

export async function POST(req: Request) {
  const { name, email, password, confirmPassword } = await req.json();

  // Vérifications des champs obligatoires
  if (!name || !email || !password || !confirmPassword) {
    return NextResponse.json(
      { message: 'All fields are required' },
      { status: 400 }
    );
  }

  // Vérification de l'égalité des mots de passe
  if (password !== confirmPassword) {
    return NextResponse.json(
      { message: 'Passwords do not match' },
      { status: 400 }
    );
  }

  // Vérification de la validité de l'email
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { message: 'Invalid email format' },
      { status: 400 }
    );
  }

  // Vérification de la sécurité du mot de passe
  if (password.length < 8) {
    return NextResponse.json(
      { message: 'Password must be at least 8 characters long' },
      { status: 400 }
    );
  }

  try {
    const user = await createUserInDb({ name, email, password });

    if (user === 'User already exists') {
      return NextResponse.json(
        { message: 'User already exists' },
        { status: 400 }
      );
    }

    // Retour de l'utilisateur créé avec un code 201
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { message: error || 'Error creating user' },
      { status: 500 }
    );
  }
}
